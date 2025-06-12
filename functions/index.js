const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Ініціалізуємо Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

/**
 * Тригер, що спрацьовує при оновленні документа гравця.
 * Роздає реферальний бонус (10% від приросту очок) користувачу, що запросив гравця.
 */
exports.distributeReferralBonus = functions.firestore
    .document("players/{userId}")
    .onUpdate(async (change, context) => {
        const beforeData = change.before.data();
        const afterData = change.after.data();

        // 1. Перевіряємо, чи є умови для нарахування бонусу:
        // - Рахунок має збільшитися.
        // - У гравця має бути зазначений реферер (той, хто його запросив).
        if (afterData.score <= beforeData.score || !afterData.referredBy) {
            return null; // Виходимо, якщо умов не дотримано
        }
        
        // 2. Розраховуємо бонус: 10% від різниці в рахунку, заокруглено вниз.
        const scoreIncrease = afterData.score - beforeData.score;
        const bonus = Math.floor(scoreIncrease * 0.10);

        // 3. Не нараховуємо бонус, якщо він менший за 1.
        if (bonus < 1) {
            return null;
        }

        try {
            // 4. Безпечно додаємо бонус до рахунку реферера, використовуючи атомарну операцію increment.
            const referrerRef = db.collection("players").doc(afterData.referredBy);
            await referrerRef.update({
                score: admin.firestore.FieldValue.increment(bonus)
            });
            console.log(`Нараховано бонус ${bonus} очок користувачу ${afterData.referredBy}.`);
            return null;
        } catch (error) {
            // **ПОКРАЩЕННЯ**: Логуємо помилку, якщо оновлення не вдалося.
            console.error(`Не вдалося нарахувати реферальний бонус користувачу ${afterData.referredBy}. Помилка:`, error);
            return null;
        }
    });

/**
 * Запланована функція, що спрацьовує о 00:00 першого числа кожного місяця за київським часом.
 * Роздає призи найкращим гравцям та скидає їхній місячний рахунок.
 */
exports.monthlyPrizeDistribution = functions.pubsub
    .schedule('0 0 1 * *') // 00:00, 1-й день місяця
    .timeZone('Europe/Kiev')
    .onRun(async (context) => {
        const playersRef = db.collection('players');
        const topPlayersQuery = playersRef.orderBy('monthlyScore', 'desc').limit(1000);

        try {
            const snapshot = await topPlayersQuery.get();

            // **ВИПРАВЛЕННЯ**: Перевіряємо, чи є взагалі гравці для нагородження.
            // Це запобігає діленню на нуль, якщо snapshot.size = 0.
            if (snapshot.empty) {
                console.log("Не знайдено гравців для місячної нагороди. Роздачу скасовано.");
                return null;
            }

            const totalPrizePool = 10000; // Загальний призовий фонд у валюті score2
            const prizePerWinner = totalPrizePool / snapshot.size; // Рівномірно ділимо приз

            // Використовуємо batch write для масового оновлення документів (це ефективно і дешево).
            const batch = db.batch();
            snapshot.forEach(doc => {
                batch.update(doc.ref, {
                    score2: admin.firestore.FieldValue.increment(prizePerWinner), // Нараховуємо приз
                    monthlyScore: 0 // Скидаємо місячний рахунок
                });
            });

            // Виконуємо всі оновлення одночасно
            await batch.commit();
            
            console.log(`Роздачу місячних призів завершено. ${snapshot.size} гравців отримали по ${prizePerWinner} WEE.`);
            return null;
        } catch (error) {
            console.error("Критична помилка під час роздачі місячних призів:", error);
            return null;
        }
    });


/**
 * HTTPS Callable функція для обробки виконання користувацького завдання.
 * Викликається з клієнта, коли гравець натискає кнопку "Виконати".
 */
exports.completeCustomTask = functions.https.onCall(async (data, context) => {
    // 1. Перевірка автентифікації: функцію може викликати лише залогінений користувач.
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Функція має викликатися автентифікованим користувачем.');
    }
    const { taskId } = data;
    const userId = context.auth.uid;

    // 2. Валідація вхідних даних: перевіряємо, чи передано ID завдання.
    if (!taskId) {
        throw new functions.https.HttpsError('invalid-argument', 'Функція має викликатися з аргументом "taskId".');
    }

    // 3. Отримуємо посилання на документи, які будуть залучені в операції.
    const taskRef = db.collection('customTasks').doc(taskId);
    const playerRef = db.collection('players').doc(userId);
    const completionRef = taskRef.collection('completedBy').doc(userId); // Документ-маркер, що фіксує виконання

    try {
        // 4. Запускаємо транзакцію. Це гарантує, що всі операції (читання і запис)
        // будуть виконані як єдине ціле. Якщо хоча б одна операція провалиться,
        // усі зміни будуть відкочені. Це захищає від накруток.
        const result = await db.runTransaction(async (transaction) => {
            // Читаємо всі потрібні документи всередині транзакції
            const taskDoc = await transaction.get(taskRef);
            const playerDoc = await transaction.get(playerRef);
            const completionDoc = await transaction.get(completionRef);

            // 5. Проводимо низку перевірок бізнес-логіки:
            if (!taskDoc.exists) throw new Error("Завдання не існує.");
            
            const taskData = taskDoc.data();
            if (!taskData.isActive) throw new Error("Це завдання більше не активне.");
            if (taskData.creatorId === userId) throw new Error("Ви не можете виконувати власне завдання.");
            if (completionDoc.exists) throw new Error("Ви вже виконували це завдання.");
            if (!playerDoc.exists) throw new Error("Ваш профіль гравця не знайдено.");

            // 6. Якщо всі перевірки пройдено, готуємо зміни:
            const newVisits = (taskData.currentVisits || 0) + 1;
            const newPlayerScore = (playerDoc.data().score || 0) + taskData.reward;

            // 7. Додаємо операції запису до черги транзакції:
            transaction.update(taskRef, { currentVisits: newVisits }); // Оновлюємо лічильник виконань
            transaction.set(completionRef, { completedAt: admin.firestore.FieldValue.serverTimestamp() }); // Створюємо маркер виконання
            transaction.update(playerRef, { score: newPlayerScore }); // Нараховуємо нагороду гравцю

            // Якщо лічильник досяг мети, деактивуємо завдання
            if (newVisits >= taskData.goal) {
                transaction.update(taskRef, { isActive: false });
            }
            
            // Повертаємо дані з транзакції для відправки на клієнт
            return { newScore: newPlayerScore };
        });
        
        // 8. Якщо транзакція успішна, відправляємо позитивну відповідь на клієнт.
        return { success: true, message: "Нагороду зараховано!", newScore: result.newScore };

    } catch (error) {
        // 9. Якщо транзакція провалилася на будь-якому етапі, логуємо помилку
        // і відправляємо її на клієнт у стандартизованому форматі.
        console.error('Транзакція виконання завдання провалилася: ', error);
        throw new functions.https.HttpsError('aborted', error.message);
    }
});
