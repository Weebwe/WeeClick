const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

exports.distributeReferralBonus = functions.firestore
    .document("players/{userId}")
    .onUpdate(async (change, context) => {
        const beforeData = change.before.data();
        const afterData = change.after.data();
        if (afterData.score <= beforeData.score || !afterData.referredBy) return null;
        const bonus = Math.floor((afterData.score - beforeData.score) * 0.10);
        if (bonus < 1) return null;
        try {
            await db.collection("players").doc(afterData.referredBy).update({ score: admin.firestore.FieldValue.increment(bonus) });
            return null;
        } catch (error) { return null; }
    });

exports.monthlyPrizeDistribution = functions.pubsub
    .schedule('0 0 1 * *').timeZone('Europe/Kiev')
    .onRun(async (context) => {
        const playersRef = db.collection('players');
        const topPlayersQuery = playersRef.orderBy('monthlyScore', 'desc').limit(1000);
        try {
            const snapshot = await topPlayersQuery.get();
            if (snapshot.empty) return null;
            const prizePerWinner = 10000 / snapshot.size;
            const batch = db.batch();
            snapshot.forEach(doc => batch.update(doc.ref, { score2: admin.firestore.FieldValue.increment(prizePerWinner) }));
            await batch.commit();
            console.log("Prize distribution complete.");
            return null;
        } catch (error) { return null; }
    });

exports.completeCustomTask = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    const { taskId } = data;
    const userId = context.auth.uid;
    const taskRef = db.collection('customTasks').doc(taskId);
    const playerRef = db.collection('players').doc(userId);
    const completionRef = taskRef.collection('completedBy').doc(userId);

    try {
        const result = await db.runTransaction(async (transaction) => {
            const taskDoc = await transaction.get(taskRef);
            const playerDoc = await transaction.get(playerRef);
            const completionDoc = await transaction.get(completionRef);

            if (!taskDoc.exists) throw new Error("Task does not exist.");
            const taskData = taskDoc.data();
            if (!taskData.isActive) throw new Error("This task is no longer active.");
            if (taskData.creatorId === userId) throw new Error("You cannot complete your own task.");
            if (completionDoc.exists) throw new Error("You have already completed this task.");
            if (!playerDoc.exists) throw new Error("Player profile not found.");

            const newVisits = taskData.currentVisits + 1;
            const newPlayerScore = (playerDoc.data().score || 0) + taskData.reward;

            transaction.update(taskRef, { currentVisits: newVisits });
            transaction.set(completionRef, { completedAt: admin.firestore.FieldValue.serverTimestamp() });
            transaction.update(playerRef, { score: newPlayerScore });

            if (newVisits >= taskData.goal) transaction.update(taskRef, { isActive: false });
            
            return { newScore: newPlayerScore };
        });
        
        return { success: true, message: "Нагороду зараховано!", newScore: result.newScore };

    } catch (error) {
        throw new functions.https.HttpsError('aborted', error.message);
    }
});
