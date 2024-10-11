// Получение элементов DOM
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Размеры канваса
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;

// Переменные игры
let toiletWidth;
let toiletHeight;
let bonusWidth;
let bonusHeight;
let isShooting = false;
let streamX;
let streamY;
let lastStreamX;
const gravity = 0.1;
const streamParticles = [];
const toilets = [];
const bonuses = [];

// Настройки игры
let balance = 0;
let totalScore = 0;
let highScore = parseInt(localStorage.getItem('highScore')) || 0;
let lives = 3;
let missedToilets = 0;
let gameOver = false;

// Звуки
const hitSound = document.getElementById('hitSound');
const upgradeSound = document.getElementById('upgradeSound');
const levelUpSound = document.getElementById('levelUpSound');
const lifeLostSound = document.getElementById('lifeLostSound');
const streamSound = document.getElementById('streamSound');

// Новые звуки
const backgroundMusic = document.getElementById('backgroundMusic');
const buttonSound = document.getElementById('buttonSound');
const gameOverSound = document.getElementById('gameOverSound');

// Элементы интерфейса
const splashScreen = document.getElementById('splashScreen');
const startButton = document.getElementById('startButton');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const urineBar = document.getElementById('urineBar');
const urineFill = document.getElementById('urineFill');
const urineBonusOverlay = document.getElementById('urineBonusOverlay');
const levelNotification = document.getElementById('levelNotification');

// Настройки унитазов
let toiletSpeed = 1.2;
let toiletSpawnInterval = 2000;
let maxToilets = 3;
let toiletFillTime = 50;

// Настройки бонусов
const bonusTypes = ['bonus1', 'bonus2'];
let lastBonusTime = 0;
let bonusSpawnInterval = 60000; // 60 секунд
const bonusFillTime = 100;

// Прогресс улучшений
let upgradeProgress = 0;
let capacityUpgrades = 0;

// Шкала мочи
let urineLevel = 100;
let maxUrineLevel = 100;
let baseMaxUrineLevel = 100;
let streamBasePower = 7;

// Переменные для повышения сложности
let gameDuration = 0;
let speedIncreaseInterval = 30000;
let sizeDecreaseInterval = 45000;
let toiletIncreaseInterval = 20000;

// Уведомления
let notificationTimeout = null;
let notificationActive = false;
let lastNotificationTime = 0;

// Фразы для уведомлений
const phrases = [
    "Попади в цель!",
    "Ты справишься!",
    "Продолжай в том же духе!",
    "Отличная работа!",
    "Ты на высоте!"
];

// Загрузка изображений
const toiletImg = new Image();
toiletImg.src = 'toilet.png';

const bonus1Img = new Image();
bonus1Img.src = 'bonus.png';

const bonus2Img = new Image();
bonus2Img.src = 'bonus2.png';

const lifeImg = new Image();
lifeImg.src = 'life.png';

// Отслеживание загрузки ресурсов
let resourcesLoaded = 0;
const totalResources = 4 + 8; // 4 изображения + 8 звуков

function resourceLoaded() {
    resourcesLoaded++;
    if (resourcesLoaded === totalResources) {
        startButton.disabled = false; // Активируем кнопку после загрузки ресурсов
    }
}

function resourceError() {
    console.error('Не удалось загрузить ресурс');
    resourcesLoaded++;
    if (resourcesLoaded === totalResources) {
        startButton.disabled = false; // Активируем кнопку даже если ресурсы не загрузились
    }
}

// Отслеживаем загрузку изображений
toiletImg.onload = resourceLoaded;
toiletImg.onerror = resourceError;

bonus1Img.onload = resourceLoaded;
bonus1Img.onerror = resourceError;

bonus2Img.onload = resourceLoaded;
bonus2Img.onerror = resourceError;

lifeImg.onload = resourceLoaded;
lifeImg.onerror = resourceError;

// Отслеживаем загрузку звуков
const sounds = [hitSound, upgradeSound, levelUpSound, lifeLostSound, streamSound, backgroundMusic, buttonSound, gameOverSound];
sounds.forEach(sound => {
    sound.onloadeddata = resourceLoaded;
    sound.onerror = resourceError;
});

// Цвет струи
let urineColor = 'yellow';

// Обработчики событий для управления
function setupControls() {
    canvas.addEventListener('mousedown', (event) => {
        event.preventDefault();
        if (urineLevel > 0) {
            isShooting = true;
            streamSound.play().catch(() => {
                console.log('Автовоспроизведение заблокировано');
            });
        }
    });

    canvas.addEventListener('mouseup', (event) => {
        event.preventDefault();
        isShooting = false;
        streamSound.pause();
        streamSound.currentTime = 0;
    });

    canvas.addEventListener('mousemove', (event) => {
        event.preventDefault();
        lastStreamX = streamX;
        streamX = event.clientX;
    });

    canvas.addEventListener('touchstart', (event) => {
        event.preventDefault();
        if (urineLevel > 0) {
            isShooting = true;
            streamSound.play().catch(() => {
                console.log('Автовоспроизведение заблокировано');
            });
        }
    }, { passive: false });

    canvas.addEventListener('touchend', (event) => {
        event.preventDefault();
        isShooting = false;
        streamSound.pause();
        streamSound.currentTime = 0;
    }, { passive: false });

    canvas.addEventListener('touchmove', (event) => {
        event.preventDefault();
        lastStreamX = streamX;
        const touch = event.touches[0];
        streamX = touch.clientX;
    }, { passive: false });
}

// Функция изменения размера канваса
function resizeCanvas() {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Обновляем размеры унитазов
    updateToiletSize();

    // Обновляем позицию струи
    streamY = canvasHeight - 30;
    streamX = canvasWidth / 2;
    lastStreamX = streamX;
}

window.addEventListener('resize', debounce(resizeCanvas, 100));

// Инициализация канваса и позиции струи
resizeCanvas();

// Функция обновления размеров унитазов
function updateToiletSize() {
    if (window.innerWidth <= 768) {
        // На мобильных устройствах
        toiletWidth = canvasWidth * 0.24; // Увеличили в 2 раза
        bonusWidth = toiletWidth; // Бонусы того же размера
    } else {
        // На десктопе
        toiletWidth = canvasWidth * 0.12;
        bonusWidth = toiletWidth;
    }
    toiletHeight = toiletWidth * 1.3;
    bonusHeight = bonusWidth * 1.3;
}

// Функция для плавного изменения цветового тона изображений
function applyColorShift() {
    const shiftRange = 70; // Диапазон изменения цветового тона (-20 до +50)
    const shiftSpeed = 0.1; // Скорость изменения
    let hueShift = -20;
    let shiftDirection = 1;

    function updateHue() {
        hueShift += shiftDirection * shiftSpeed;
        if (hueShift >= 50 || hueShift <= -20) {
            shiftDirection *= -1;
        }
        requestAnimationFrame(updateHue);
    }

    updateHue();

    // Применяем фильтр при отрисовке изображений
    return function getHueRotate() {
        return `hue-rotate(${hueShift}deg)`;
    };
}

const getHueRotate = applyColorShift();

// Функция генерации унитазов
function spawnToilet() {
    if (toilets.length < maxToilets) {
        const x = Math.random() * (canvasWidth - toiletWidth);
        const speedX = Math.random() * 2 - 1;
        toilets.push({ x: x, y: -toiletHeight, speedX: speedX, fillProgress: 0 });
    }
}

// Функция генерации бонусов
function spawnBonus() {
    const currentTime = Date.now();
    if (currentTime - lastBonusTime >= bonusSpawnInterval) {
        const bonusType = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
        const x = Math.random() * (canvasWidth - bonusWidth);
        const speedX = Math.random() * 2 - 1;
        const speedY = 1 + Math.random();
        bonuses.push({ x: x, y: -bonusHeight, type: bonusType, speedX: speedX, speedY: speedY, fillProgress: 0 });
        lastBonusTime = currentTime;
    }
}

// Функция обновления унитазов
function updateToilets() {
    for (let i = toilets.length - 1; i >= 0; i--) {
        const toilet = toilets[i];
        toilet.y += toiletSpeed;
        toilet.x += toilet.speedX;

        if (toilet.x <= 0 || toilet.x >= canvasWidth - toiletWidth) {
            toilet.speedX *= -1;
        }

        // Если унитаз вышел за пределы экрана
        if (toilet.y > canvasHeight) {
            toilets.splice(i, 1);
            missedToilets++;
            updateLives();

            if (missedToilets >= 3) {
                endGame();
            }
        }
    }
}

// Функция обновления бонусов
function updateBonuses() {
    for (let i = bonuses.length - 1; i >= 0; i--) {
        const bonus = bonuses[i];
        bonus.x += bonus.speedX;
        bonus.y += bonus.speedY;

        // Отскок от краев
        if (bonus.x <= 0 || bonus.x >= canvasWidth - bonusWidth) {
            bonus.speedX *= -1;
        }

        if (bonus.y > canvasHeight) {
            bonuses.splice(i, 1);
        }
    }
}

// Функция отрисовки унитазов
function drawToilets() {
    toilets.forEach(toilet => {
        ctx.save();
        ctx.filter = getHueRotate();
        ctx.drawImage(toiletImg, toilet.x, toilet.y, toiletWidth, toiletHeight);
        ctx.restore();
    });
}

// Функция отрисовки бонусов
function drawBonuses() {
    bonuses.forEach(bonus => {
        ctx.save();
        ctx.filter = getHueRotate();
        const img = bonus.type === 'bonus1' ? bonus1Img : bonus2Img;
        let bonusDrawHeight = bonusHeight;

        if (bonus.type === 'bonus2') {
            // Для bonus2 делаем изображение квадратным
            bonusDrawHeight = bonusWidth;
        }

        ctx.drawImage(img, bonus.x, bonus.y, bonusWidth, bonusDrawHeight);
        ctx.restore();
    });
}

// Функция создания частицы струи
function createStreamParticle() {
    const dx = streamX - lastStreamX;
    const speed = Math.abs(dx);
    const spread = speed * 0.1 + 0.5;
    return {
        x: streamX,
        y: streamY,
        velocityX: (Math.random() - 0.5) * spread,
        velocityY: -streamBasePower + Math.random() * 0.5,
        lifetime: 0,
        size: Math.random() * 1.5 + 1,
        color: urineColor,
        collided: false
    };
}

// Функция ограничения количества частиц
const maxParticles = 500;
function limitParticles() {
    if (streamParticles.length > maxParticles) {
        streamParticles.splice(0, streamParticles.length - maxParticles);
    }
}

// Функция отрисовки струи
function drawStream() {
    if (isShooting && urineLevel > 0) {
        for (let i = 0; i < 2; i++) {
            streamParticles.push(createStreamParticle());
        }
        urineLevel -= 0.5; // Струя потребляет мочу
        if (urineLevel <= 0) {
            urineLevel = 0;
            isShooting = false;
            streamSound.pause();
            streamSound.currentTime = 0;
        }
    } else if (urineLevel < maxUrineLevel) {
        let recoveryRate = urineLevel < maxUrineLevel / 2 ? 0.9 : 0.45;
        urineLevel += recoveryRate;
        if (urineLevel > maxUrineLevel) {
            urineLevel = maxUrineLevel;
        }
    }

    for (let i = streamParticles.length - 1; i >= 0; i--) {
        const particle = streamParticles[i];

        if (!particle.collided) {
            particle.x += particle.velocityX;
            particle.y += particle.velocityY;
            particle.velocityY += gravity;
        } else {
            particle.x += particle.velocityX * 0.5;
            particle.y += particle.velocityY * 0.5;
            particle.velocityY += gravity * 0.5;
        }

        // Размер частиц уменьшается с их временем жизни
        const size = particle.size * (1 - particle.lifetime / 100);

        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fill();

        particle.lifetime++;

        if (particle.y > canvasHeight || particle.lifetime > 100) {
            streamParticles.splice(i, 1);
        }
    }
    limitParticles();
    lastStreamX = streamX;
}

// Функция обновления шкалы мочи
function updateUrineBar() {
    const percentage = (urineLevel / maxUrineLevel) * 100;
    urineFill.style.width = `${percentage}%`;

    // Визуальные эффекты для увеличенного запаса или бонуса
    if (bonus1Active) {
        urineBonusOverlay.style.display = 'block';
    } else {
        urineBonusOverlay.style.display = 'none';
    }
}

// Функция проверки на столкновения
function checkCollisions() {
    // Проверка столкновений с бонусами
    bonuses.forEach((bonus, bIndex) => {
        streamParticles.forEach(particle => {
            if (
                !particle.collided &&
                particle.x >= bonus.x &&
                particle.x <= bonus.x + bonusWidth &&
                particle.y >= bonus.y &&
                particle.y <= bonus.y + bonusHeight
            ) {
                particle.collided = true;
                particle.velocityX *= -0.5;
                particle.velocityY *= -0.5;
                bonus.fillProgress += 1;
            }
        });

        if (bonus.fillProgress >= bonusFillTime) {
            // Анимация взрыва бонуса
            createBonusExplosion(bonus);
            if (bonus.type === 'bonus1') {
                activateBonus1();
            } else if (bonus.type === 'bonus2') {
                activateBonus2();
            }
            bonuses.splice(bIndex, 1);
        }
    });

    // Проверка столкновений с унитазами
    toilets.forEach((toilet, tIndex) => {
        streamParticles.forEach(particle => {
            if (
                !particle.collided &&
                particle.x >= toilet.x &&
                particle.x <= toilet.x + toiletWidth &&
                particle.y >= toilet.y &&
                particle.y <= toilet.y + toiletHeight
            ) {
                particle.collided = true;
                particle.velocityX *= -0.5;
                particle.velocityY *= -0.5;
                toilet.fillProgress += 1;
            }
        });

        if (toilet.fillProgress >= toiletFillTime) {
            balance += 10;
            totalScore += 10;
            createToiletExplosion(toilet);
            toilets.splice(tIndex, 1);
        }
    });
}

// Функция анимации взрыва унитаза
function createToiletExplosion(toilet) {
    for (let i = 0; i < 50; i++) {
        streamParticles.push({
            x: toilet.x + toiletWidth / 2,
            y: toilet.y + toiletHeight / 2,
            velocityX: (Math.random() - 0.5) * 4,
            velocityY: (Math.random() - 0.5) * 4,
            lifetime: 0,
            size: Math.random() * 2 + 1,
            color: urineColor,
            collided: true
        });
    }
    hitSound.play().catch(() => {
        console.log('Автовоспроизведение заблокировано');
    });
}

// Функция анимации взрыва бонуса
function createBonusExplosion(bonus) {
    for (let i = 0; i < 50; i++) {
        streamParticles.push({
            x: bonus.x + bonusWidth / 2,
            y: bonus.y + bonusHeight / 2,
            velocityX: (Math.random() - 0.5) * 4,
            velocityY: (Math.random() - 0.5) * 4,
            lifetime: 0,
            size: Math.random() * 2 + 1,
            color: urineColor,
            collided: true
        });
    }
    hitSound.play().catch(() => {
        console.log('Автовоспроизведение заблокировано');
    });
}

// Активировать бонус 1
let bonus1Active = false;
function activateBonus1() {
    if (bonus1Active) return;
    bonus1Active = true;
    maxUrineLevel *= 2; // Увеличиваем максимальный запас мочи в 2 раза
    urineLevel = maxUrineLevel; // Полностью заполняем мочу
    urineColor = '#0ABAB5'; // Цвет Тиффани
    updateUrineBar();
    setTimeout(() => {
        bonus1Active = false;
        maxUrineLevel = baseMaxUrineLevel + capacityUpgrades * 25; // Возвращаем максимальный запас мочи
        if (urineLevel > maxUrineLevel) urineLevel = maxUrineLevel;
        urineColor = 'yellow';
        updateUrineBar();
    }, 20000); // 20 секунд
}

// Активировать бонус 2
function activateBonus2() {
    balance += 150;
    // Анимация мигания баланса
    const scoreboard = document.getElementById('scoreboard');
    scoreboard.classList.add('rainbow-flash');
    setTimeout(() => {
        scoreboard.classList.remove('rainbow-flash');
    }, 1000);
}

// Функция обновления очков
function updateScore() {
    document.getElementById('scoreboard').textContent = `Баланс: ${balance}`;
    document.getElementById('totalScore').textContent = `Всего: ${totalScore}`;
    document.getElementById('highscore').textContent = `Лучший счёт: ${highScore}`;
}

// Функция обновления прогресса улучшений
function updateUpgradeProgress() {
    upgradeProgress = ((streamBasePower - 7) + capacityUpgrades) * 5;
    progressFill.style.width = upgradeProgress + '%';
}

// Функция обновления жизней
function updateLives() {
    const lifeIcons = ['life1', 'life2', 'life3'];
    if (missedToilets > 0 && missedToilets <= 3) {
        const lifeIcon = document.getElementById(lifeIcons[missedToilets - 1]);
        lifeIcon.classList.add('life-lost');
        lifeLostSound.play().catch(() => {
            console.log('Автовоспроизведение заблокировано');
        });
        setTimeout(() => {
            lifeIcon.style.visibility = 'hidden';
        }, 1000);
    }
}

// Функция увеличения сложности
function increaseDifficulty() {
    gameDuration += 16.67; // Используем значение кадра (~60 FPS)

    if (gameDuration % speedIncreaseInterval < 16.67) {
        toiletSpeed += 0.15; // Ускорение
    }

    if (gameDuration % sizeDecreaseInterval < 16.67) {
        toiletWidth *= 0.985; // Уменьшение размера
        toiletHeight = toiletWidth * 1.3;
        bonusWidth = toiletWidth; // Корректируем размер бонусов
        bonusHeight = bonusWidth * 1.3;
    }

    if (gameDuration % toiletIncreaseInterval < 16.67) {
        maxToilets += 1; // Увеличиваем максимальное количество унитазов
    }

    // Изменение требуемого количества попаданий по времени
    if (gameDuration >= 120000 && gameDuration < 240000) { // После 2 минут
        toiletFillTime = 100;
    } else if (gameDuration >= 240000) { // После 4 минут
        toiletFillTime = 150;
    }

    // Показываем уведомление не чаще раза в минуту
    const currentTime = Date.now();
    if (currentTime - lastNotificationTime >= 60000 && !notificationActive) {
        showLevelUpNotification();
        lastNotificationTime = currentTime;
    }
}

// Функция уведомления
function showLevelUpNotification() {
    if (notificationActive) return;

    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    levelNotification.textContent = randomPhrase;
    levelNotification.style.display = 'block';
    levelUpSound.play().catch(() => {
        console.log('Автовоспроизведение заблокировано');
    });
    notificationActive = true;

    notificationTimeout = setTimeout(() => {
        levelNotification.style.display = 'none';
        notificationActive = false;
    }, 1000); // 1 секунда
}

// Функции для управления музыкой и звуками
function playBackgroundMusic() {
    backgroundMusic.play().catch(() => {
        console.log('Автовоспроизведение заблокировано');
    });
}

function stopBackgroundMusic() {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
}

function playButtonSound() {
    buttonSound.play().catch(() => {
        console.log('Автовоспроизведение заблокировано');
    });
}

function playGameOverSound() {
    gameOverSound.play().catch(() => {
        console.log('Автовоспроизведение заблокировано');
    });
}

// Функция завершения игры
function endGame() {
    gameOver = true;
    document.getElementById('gameOver').style.display = 'block';
    streamSound.pause();
    playGameOverSound(); // Воспроизводим звук Game Over
    stopBackgroundMusic(); // Останавливаем фоновую музыку
    if (totalScore > highScore) {
        highScore = totalScore;
        localStorage.setItem('highScore', highScore);
    }

    // Останавливаем интервалы
    clearInterval(toiletSpawnIntervalId);
    clearInterval(bonusSpawnIntervalId);
}

// Функция перезапуска игры
function restartGame() {
    playButtonSound(); // Воспроизведение звука кнопки
    document.getElementById('gameOver').style.display = 'none';
    balance = 0;
    totalScore = 0;
    missedToilets = 0;
    toiletSpeed = 1.2;
    updateToiletSize();
    toilets.length = 0;
    bonuses.length = 0;
    streamParticles.length = 0; // Очищаем частицы струи
    lives = 3;
    streamBasePower = 7;
    powerUpgradeCost = 50;
    capacityUpgradeCost = 50;
    capacityUpgrades = 0;
    maxToilets = 3;
    urineLevel = maxUrineLevel = baseMaxUrineLevel = 100;
    bonus1Active = false;
    urineColor = 'yellow';
    gameDuration = 0;
    notificationActive = false;
    notificationTimeout = null;
    lastNotificationTime = 0;
    toiletFillTime = 50; // Сбрасываем до начального значения
    updateScore();
    updateUpgradeButtons();
    updateUrineBar();
    const lifeIcons = ['life1', 'life2', 'life3'];
    lifeIcons.forEach(life => {
        const lifeIcon = document.getElementById(life);
        lifeIcon.style.visibility = 'visible';
        lifeIcon.classList.remove('life-lost');
    });
    gameOver = false;

    // Перезапускаем интервалы
    toiletSpawnIntervalId = setInterval(spawnToilet, toiletSpawnInterval);
    bonusSpawnIntervalId = setInterval(spawnBonus, 1000); // Проверяем возможность спавна бонуса каждую секунду

    playBackgroundMusic(); // Воспроизводим фоновую музыку

    gameLoop();
}

// Стоимость улучшений
let powerUpgradeCost = 50;
let capacityUpgradeCost = 50;

// Функция обновления текста на кнопках улучшений
function updateUpgradeButtons() {
    document.getElementById('powerUpgrade').textContent = `Напор (${powerUpgradeCost} монет)`;
    document.getElementById('capacityUpgrade').textContent = `Запас мочи (${capacityUpgradeCost} монет)`;
}

// Обработчики событий для улучшений
document.getElementById('powerUpgrade').addEventListener('click', () => {
    if (balance >= powerUpgradeCost) {
        balance -= powerUpgradeCost;
        streamBasePower += 2;
        powerUpgradeCost += 50; // Увеличиваем стоимость
        upgradeSound.play().catch(() => {
            console.log('Автовоспроизведение заблокировано');
        });
        document.getElementById('powerUpgrade').classList.add('bought');
        updateUpgradeButtons();
        setTimeout(() => {
            document.getElementById('powerUpgrade').classList.remove('bought');
        }, 500);
    }
});

document.getElementById('capacityUpgrade').addEventListener('click', () => {
    if (balance >= capacityUpgradeCost) {
        balance -= capacityUpgradeCost;
        capacityUpgrades++;
        maxUrineLevel += 25; // Увеличиваем максимальный запас мочи на 25
        baseMaxUrineLevel += 25;
        capacityUpgradeCost += 50; // Увеличиваем стоимость
        urineLevel = maxUrineLevel; // Полностью заполняем запас мочи
        updateUrineBar();
        upgradeSound.play().catch(() => {
            console.log('Автовоспроизведение заблокировано');
        });
        document.getElementById('capacityUpgrade').classList.add('bought');
        updateUpgradeButtons();
        setTimeout(() => {
            document.getElementById('capacityUpgrade').classList.remove('bought');
        }, 500);
    }
});

// Переменные для хранения идентификаторов интервалов
let toiletSpawnIntervalId;
let bonusSpawnIntervalId;

// Запуск игры
function initGame() {
    setupControls();
    updateToiletSize();
    toiletSpawnIntervalId = setInterval(spawnToilet, toiletSpawnInterval);
    bonusSpawnIntervalId = setInterval(spawnBonus, 1000); // Проверяем возможность спавна бонуса каждую секунду
    updateUpgradeButtons();
    playBackgroundMusic();
}

// Обработчик нажатия кнопки "Начать игру"
startButton.addEventListener('click', () => {
    startGame();
});

// Функция старта игры
function startGame() {
    playButtonSound(); // Воспроизведение звука кнопки
    splashScreen.style.display = 'none';
    initGame();
    gameLoop();
}

// Обработчик нажатия кнопки "Начать заново"
document.getElementById('restartButton').addEventListener('click', () => {
    restartGame();
});

// Функция для дебаунса
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Основной цикл игры
function gameLoop() {
    if (!gameOver) {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        updateToilets();
        updateBonuses();
        drawToilets();
        drawBonuses();
        drawStream();
        updateUrineBar();
        checkCollisions();
        updateScore();
        updateUpgradeProgress();
        increaseDifficulty();
        requestAnimationFrame(gameLoop);
    }
}
