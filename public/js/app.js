document.addEventListener('DOMContentLoaded', () => {
    // --- SETTINGS ---
    const settings = {
        breakInterval: localStorage.getItem('breakInterval') || '30',
        customBreakDuration: localStorage.getItem('customBreakDuration') || '5',
        enableSound: localStorage.getItem('enableSound') === 'true',
        notificationSound: localStorage.getItem('notificationSound') || 'Default Beep',
        startTimerAuto: localStorage.getItem('startTimerAuto') !== 'false',
        pauseIdle: localStorage.getItem('pauseIdle') === 'true',
    };

    // --- HISTORY ---
    let sessionHistory = JSON.parse(localStorage.getItem('sessionHistory')) || [];

    function logSession(startTime, endTime) {
        const duration = Math.round((new Date(endTime) - new Date(startTime)) / 1000);
        if (duration > 0) {
            sessionHistory.push({ startTime, endTime, duration });
            localStorage.setItem('sessionHistory', JSON.stringify(sessionHistory));
        }
    }

    // --- TIMER LOGIC ---
    const currentSessionElement = document.getElementById('current-session-time');
    let seconds = parseInt(localStorage.getItem('sessionSeconds')) || 0;
    let sessionStartTime = localStorage.getItem('sessionStartTime') || null;
    let interval = null;
    let breakAlerts = {}; // Dynamic alerts

    function setupAlerts() {
        let intervalValue = settings.breakInterval === 'custom' ? parseInt(settings.customBreakDuration) : parseInt(settings.breakInterval);
        if (!isNaN(intervalValue) && intervalValue > 0) {
            const intervalInSeconds = intervalValue * 60;
            for (let i = 1; i <= 5; i++) {
                const breakTime = intervalInSeconds * i;
                if (!breakAlerts[breakTime]) {
                     breakAlerts[breakTime] = JSON.parse(localStorage.getItem(`breakAlert${breakTime}`)) || false;
                }
            }
        }
    }

    function formatTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        const paddedMinutes = minutes.toString().padStart(2, '0');
        const paddedSeconds = secs.toString().padStart(2, '0');
        if (hours > 0) return `${hours}h ${paddedMinutes}m`;
        return `${paddedMinutes}:${paddedSeconds}`;
    }
     function formatHistoryTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }


    function checkBreaks(totalSeconds) {
        for (const time in breakAlerts) {
            if (totalSeconds >= parseInt(time) && !breakAlerts[time]) {
                if(settings.enableSound) console.log(`Playing sound: ${settings.notificationSound}`);
                breakAlerts[time] = true;
                localStorage.setItem(`breakAlert${time}`, true);
                window.location.href = 'break-timer.html';
            }
        }
    }

    function updateTimer() {
        seconds++;
        localStorage.setItem('sessionSeconds', seconds);
        if (currentSessionElement) currentSessionElement.textContent = formatTime(seconds);
        updateDashboardUI();
        checkBreaks(seconds);
    }

    function startTimer() {
        if (!interval) {
            if (!sessionStartTime) {
                sessionStartTime = new Date().toISOString();
                localStorage.setItem('sessionStartTime', sessionStartTime);
            }
            interval = setInterval(updateTimer, 1000);
        }
    }

    function stopTimer() {
        clearInterval(interval);
        interval = null;
        if (sessionStartTime) {
            logSession(sessionStartTime, new Date().toISOString());
            sessionStartTime = null;
            localStorage.removeItem('sessionStartTime');
        }
    }

    function resetTimer() {
        stopTimer();
        seconds = 0;
        localStorage.setItem('sessionSeconds', seconds);
        if (currentSessionElement) currentSessionElement.textContent = formatTime(seconds);
        Object.keys(breakAlerts).forEach(key => {
            breakAlerts[key] = false;
            localStorage.setItem(`breakAlert${key}`, false);
        });
        if (settings.startTimerAuto) startTimer();
    }

    function updateDashboardUI() {
        // Total Today
        const today = new Date().toLocaleDateString();
        const todaySeconds = sessionHistory.reduce((total, session) => {
            if (new Date(session.startTime).toLocaleDateString() === today) {
                return total + session.duration;
            }
            return total;
        }, 0) + seconds;
        document.getElementById('total-today-time').textContent = formatHistoryTime(todaySeconds);

        // Upcoming Breaks
        const upcomingBreaksSection = document.getElementById('upcoming-breaks-section').querySelector('div');
        upcomingBreaksSection.innerHTML = '';
        let intervalValue = settings.breakInterval === 'custom' ? parseInt(settings.customBreakDuration) : parseInt(settings.breakInterval);
        if (!isNaN(intervalValue) && intervalValue > 0) {
            const intervalInSeconds = intervalValue * 60;
            const nextBreakTime = Object.keys(breakAlerts).find(time => !breakAlerts[time]);
            if (nextBreakTime) {
                const remainingSeconds = nextBreakTime - seconds;
                const percentage = Math.max(0, 100 - (remainingSeconds / intervalInSeconds) * 100);
                const breakElement = document.createElement('div');
                breakElement.className = 'flex flex-col gap-3';
                breakElement.innerHTML = `
                    <div class="flex items-baseline justify-between gap-6">
                        <p class="text-white text-base font-medium leading-normal">Next Break (${intervalValue} min)</p>
                        <p class="text-white/80 text-sm font-normal leading-normal">${Math.round(percentage)}%</p>
                    </div>
                    <div class="h-2 w-full rounded-full bg-[#325567]">
                        <div class="h-2 rounded-full bg-primary" style="width: ${percentage}%;"></div>
                    </div>
                    <p class="text-[#92b7c9] text-sm font-normal leading-normal">Break in ${Math.ceil(remainingSeconds / 60)} minutes</p>
                `;
                upcomingBreaksSection.appendChild(breakElement);
            }
        }
    }

    // --- PAGE SPECIFIC LOGIC ---
    if (document.getElementById('current-session-time')) { // Dashboard
        setupAlerts();
        currentSessionElement.textContent = formatTime(seconds);
        if (settings.startTimerAuto) startTimer();
        updateDashboardUI();
        const pauseButton = Array.from(document.querySelectorAll('header button')).find(btn => btn.querySelector('.material-symbols-outlined').textContent.includes('pause'));
        if(pauseButton) {
            pauseButton.addEventListener('click', () => {
                if (interval) {
                    stopTimer();
                    pauseButton.querySelector('.material-symbols-outlined').textContent = 'play_arrow';
                } else {
                    startTimer();
                    pauseButton.querySelector('.material-symbols-outlined').textContent = 'pause';
                }
            });
        }
        const refreshButton = Array.from(document.querySelectorAll('header button')).find(btn => btn.querySelector('.material-symbols-outlined').textContent.includes('refresh'));
        if(refreshButton) refreshButton.addEventListener('click', resetTimer);
    } else if (document.getElementById('save-changes-button')) { // Settings Page
        document.querySelector(`input[name="break-interval"][value="${settings.breakInterval}"]`).checked = true;
        document.getElementById('custom-break-duration').value = settings.customBreakDuration;
        document.getElementById('enable-sound-notifications').checked = settings.enableSound;
        document.getElementById('notification-sound').value = settings.notificationSound;
        document.getElementById('start-timer-automatically').checked = settings.startTimerAuto;
        document.getElementById('pause-tracking-idle').checked = settings.pauseIdle;

        document.getElementById('save-changes-button').addEventListener('click', () => {
            localStorage.setItem('breakInterval', document.querySelector('input[name="break-interval"]:checked').value);
            localStorage.setItem('customBreakDuration', document.getElementById('custom-break-duration').value);
            localStorage.setItem('enableSound', document.getElementById('enable-sound-notifications').checked);
            localStorage.setItem('notificationSound', document.getElementById('notification-sound').value);
            localStorage.setItem('startTimerAuto', document.getElementById('start-timer-automatically').checked);
            localStorage.setItem('pauseIdle', document.getElementById('pause-tracking-idle').checked);
            alert('Settings saved!');
        });

        document.getElementById('reset-defaults-button').addEventListener('click', () => {
            localStorage.clear();
            location.reload();
        });
    } else if (document.getElementById('history-table-body')) { // History Page
        const tableBody = document.getElementById('history-table-body');
        tableBody.innerHTML = '';
        sessionHistory.forEach(session => {
            const row = document.createElement('tr');
            row.className = 'border-b border-gray-200 dark:border-[#325567]';
            const startDate = new Date(session.startTime);
            const endDate = new Date(session.endTime);
            row.innerHTML = `
                <td class="px-6 py-4">${startDate.toLocaleDateString()}</td>
                <td class="px-6 py-4">${startDate.toLocaleTimeString()}</td>
                <td class="px-6 py-4">${endDate.toLocaleTimeString()}</td>
                <td class="px-6 py-4 font-medium">${formatHistoryTime(session.duration)}</td>
            `;
            tableBody.appendChild(row);
        });
    } else if (document.getElementById('break-minutes')) { // Break Timer Page
        const suggestions = [
            "Look at something 20 feet away for 20 seconds.",
            "Stand up and stretch your arms and legs.",
            "Get a glass of water and hydrate.",
            "Close your eyes and take a few deep breaths.",
            "Do a quick neck and shoulder roll."
        ];
        let suggestionIndex = 0;

        const minutesEl = document.getElementById('break-minutes');
        const secondsEl = document.getElementById('break-seconds');
        const progressBar = document.getElementById('break-progress-bar');

        let breakSeconds = (parseInt(settings.customBreakDuration) || 5) * 60;
        const totalBreakSeconds = breakSeconds;

        function updateBreakTimer() {
            breakSeconds--;
            const minutes = Math.floor(breakSeconds / 60);
            const secs = breakSeconds % 60;
            minutesEl.textContent = minutes.toString().padStart(2, '0');
            secondsEl.textContent = secs.toString().padStart(2, '0');
            progressBar.style.width = `${(breakSeconds / totalBreakSeconds) * 100}%`;
            if (breakSeconds <= 0) {
                clearInterval(breakInterval);
                window.location.href = 'dashboard.html';
            }
        }

        let breakInterval = setInterval(updateBreakTimer, 1000);

        document.getElementById('extend-break-button').addEventListener('click', () => {
            breakSeconds += 60;
        });

        document.getElementById('skip-break-button').addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });

        document.getElementById('next-suggestion-button').addEventListener('click', () => {
            suggestionIndex = (suggestionIndex + 1) % suggestions.length;
            document.getElementById('activity-suggestion').textContent = suggestions[suggestionIndex];
        });
    }


    // --- GLOBAL NAVIGATION ---
    document.querySelectorAll('aside nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const text = link.querySelector('p').textContent.toLowerCase();
            const pageMap = {'dashboard': 'index.html', 'history': 'history.html', 'activity log': 'history.html', 'reports': 'history.html', 'settings': 'settings.html'};
            if (pageMap[text]) window.location.href = pageMap[text];
        });
    });
});
