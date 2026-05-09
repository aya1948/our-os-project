/*****************************************
 * رسم Gantt + مقارنة + واجهة المستخدم
 *****************************************/
class GanttRenderer {
    static draw(canvas, entries) {
        if (entries.length === 0) return;
        const maxTime = entries[entries.length - 1].endTime;
        const pixelsPerUnit = Math.max(30, Math.floor(600 / (maxTime || 1)));
        const width = maxTime * pixelsPerUnit + 20;
        canvas.width = width;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barHeight = 30;
        ctx.beginPath();
        ctx.moveTo(0, barHeight + 5);
        ctx.lineTo(width, barHeight + 5);
        ctx.strokeStyle = 'black';
        ctx.stroke();

        const colors = ['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40','#C9CBCF'];
        const colorMap = {};
        let colorIndex = 0;
        const getColor = (pid) => {
            if (pid === -1) return '#D3D3D3';
            if (!colorMap[pid]) {
                colorMap[pid] = colors[colorIndex % colors.length];
                colorIndex++;
            }
            return colorMap[pid];
        };

        entries.forEach(e => {
            const x = e.startTime * pixelsPerUnit;
            const w = (e.endTime - e.startTime) * pixelsPerUnit;
            ctx.fillStyle = getColor(e.processId);
            ctx.fillRect(x, 0, w, barHeight);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x, 0, w, barHeight);
            ctx.fillStyle = 'black';
            ctx.font = '12px Arial';
            const label = e.processId === -1 ? 'Idle' : 'P' + e.processId;
            if (w > 20) ctx.fillText(label, x + 3, barHeight - 5);
        });

        for (let t = 0; t <= maxTime; t++) {
            const x = t * pixelsPerUnit;
            ctx.beginPath();
            ctx.moveTo(x, barHeight + 5 - 5);
            ctx.lineTo(x, barHeight + 5 + 5);
            ctx.stroke();
            ctx.fillStyle = 'black';
            ctx.fillText(t, x - 3, barHeight + 20);
        }
    }
}

class ComparisonEngine {
    static compute(rrProcesses, srtfProcesses, quantum) {
        const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
        const stdDev = (arr) => {
            const mean = avg(arr);
            return Math.sqrt(avg(arr.map(x => (x - mean) ** 2)));
        };

        const rrWT = rrProcesses.map(p => (p.completionTime - p.arrivalTime - p.burstTime));
        const rrTAT = rrProcesses.map(p => (p.completionTime - p.arrivalTime));
        const rrRT = rrProcesses.map(p => (p.startTime - p.arrivalTime));
        const srtfWT = srtfProcesses.map(p => (p.completionTime - p.arrivalTime - p.burstTime));
        const srtfTAT = srtfProcesses.map(p => (p.completionTime - p.arrivalTime));
        const srtfRT = srtfProcesses.map(p => (p.startTime - p.arrivalTime));

        const rrAvgWT = avg(rrWT), srtfAvgWT = avg(srtfWT);
        const rrAvgTAT = avg(rrTAT), srtfAvgTAT = avg(srtfTAT);
        const rrAvgRT = avg(rrRT), srtfAvgRT = avg(srtfRT);
        const rrStdTAT = stdDev(rrTAT), srtfStdTAT = stdDev(srtfTAT);

        let comp = `=== Comparison (Same Workload, Quantum = ${quantum}) ===\n\n`;
        comp += `Metric          | Round Robin   | SRTF\n`;
        comp += `Avg Waiting     | ${rrAvgWT.toFixed(2)}          | ${srtfAvgWT.toFixed(2)}\n`;
        comp += `Avg Turnaround  | ${rrAvgTAT.toFixed(2)}          | ${srtfAvgTAT.toFixed(2)}\n`;
        comp += `Avg Response    | ${rrAvgRT.toFixed(2)}          | ${srtfAvgRT.toFixed(2)}\n`;
        comp += `TAT Std Dev     | ${rrStdTAT.toFixed(2)}          | ${srtfStdTAT.toFixed(2)}   (lower = fairer)\n`;

        let concl = `=== Final Conclusion ===\n\n`;
        concl += `1. Average Waiting Time: `;
        if (rrAvgWT < srtfAvgWT) concl += `Round Robin gave better (lower) average waiting time.\n`;
        else if (srtfAvgWT < rrAvgWT) concl += `SRTF gave better average waiting time (short jobs finish quickly).\n`;
        else concl += `Both gave identical average waiting time.\n`;

        concl += `2. Response Time: `;
        if (rrAvgRT < srtfAvgRT) concl += `Round Robin gave faster first response (fair time-slicing).\n`;
        else if (srtfAvgRT < rrAvgRT) concl += `SRTF gave better response time (short jobs start immediately).\n`;
        else concl += `Both gave similar response times.\n`;

        concl += `3. Fairness: `;
        if (rrStdTAT < srtfStdTAT) concl += `Round Robin appears fairer (less variation in turnaround times).\n`;
        else concl += `SRTF shows less fairness, as long jobs may starve.\n`;

        concl += `4. Effect of Quantum (RR): ${quantum}. Smaller quantum improves response time but increases context switches.\n`;
        concl += `\nRecommendation: `;
        if (rrAvgWT < srtfAvgWT && rrAvgRT < srtfAvgRT) {
            concl += `Round Robin is recommended for this workload because it balances response and waiting time.`;
        } else if (srtfAvgWT < rrAvgWT && srtfAvgRT < rrAvgRT) {
            concl += `SRTF is recommended (efficient, short jobs complete quickly).`;
        } else {
            concl += `The choice depends on priority: use RR if fairness and response time matter, SRTF if overall efficiency and short‑job preference are desired.`;
        }

        return { comparisonText: comp, conclusionText: concl };
    }
}

const UI = {
    processList: [],

    // تحميل أحد السيناريوهات الجاهزة
    loadScenario(code) {
        this.clearAll(); // مسح البيانات السابقة
        let processes = [];
        let quantum = 2;

        switch (code) {
            case 'A': // Scenario A: Basic mixed workload
                processes = [
                    new Process(1, 0, 5),
                    new Process(2, 1, 3),
                    new Process(3, 2, 8),
                    new Process(4, 3, 6)
                ];
                quantum = 2;
                break;
            case 'B': // Scenario B: Quantum sensitivity
                processes = [
                    new Process(1, 0, 10),
                    new Process(2, 1, 5),
                    new Process(3, 3, 8)
                ];
                quantum = 4; // Quantum كبير نسبياً
                break;
            case 'C': // Scenario C: Short-job-heavy
                processes = [
                    new Process(1, 0, 2),
                    new Process(2, 0, 3),
                    new Process(3, 0, 1),
                    new Process(4, 0, 12)
                ];
                quantum = 1;
                break;
            case 'D': // Scenario D: Interactive-style fairness
                processes = [
                    new Process(1, 0, 4),
                    new Process(2, 1, 2),
                    new Process(3, 3, 1),
                    new Process(4, 5, 3)
                ];
                quantum = 1;
                break;
        }

        // تعبئة الجدول والحقول
        this.processList = processes;
        this.updateTable();
        document.getElementById('quantum').value = quantum;
    },

    addProcess() {
        const pid = document.getElementById('pid').value.trim();
        const arr = document.getElementById('arrival').value.trim();
        const burst = document.getElementById('burst').value.trim();

        if (!pid || !arr || !burst) {
            alert('All fields must be filled.');
            return;
        }
        const id = parseInt(pid), arrival = parseInt(arr), burstTime = parseInt(burst);
        if (isNaN(id) || isNaN(arrival) || isNaN(burstTime)) {
            alert('All inputs must be numeric.');
            return;
        }
        if (arrival < 0) { alert('Arrival time cannot be negative.'); return; }
        if (burstTime <= 0) { alert('Burst time must be greater than 0.'); return; }
        if (this.processList.some(p => p.id === id)) {
            alert('Process ID must be unique.');
            return;
        }

        this.processList.push(new Process(id, arrival, burstTime));
        this.updateTable();
        document.getElementById('pid').value = '';
        document.getElementById('arrival').value = '';
        document.getElementById('burst').value = '';
    },

    updateTable() {
        const tbody = document.querySelector('#processTable tbody');
        tbody.innerHTML = '';
        this.processList.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${p.id}</td><td>${p.arrivalTime}</td><td>${p.burstTime}</td>`;
            tbody.appendChild(tr);
        });
    },

    clearAll() {
        this.processList = [];
        this.updateTable();
        document.getElementById('quantum').value = '';
        ['rrCanvas', 'srtfCanvas'].forEach(id => {
            const canvas = document.getElementById(id);
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        });
        document.getElementById('rrTableContainer').innerHTML = '';
        document.getElementById('srtfTableContainer').innerHTML = '';
        document.getElementById('rrQueueLog').innerHTML = '';
        document.getElementById('comparisonSummary').innerHTML = '';
        document.getElementById('conclusion').innerHTML = '';
    },

    runSimulation() {
        if (this.processList.length === 0) {
            alert('Add at least one process.');
            return;
        }
        const qVal = document.getElementById('quantum').value.trim();
        if (!qVal) {
            alert('Enter a time quantum.');
            return;
        }
        const quantum = parseInt(qVal);
        if (isNaN(quantum) || quantum <= 0) {
            alert('Quantum must be a positive integer.');
            return;
        }

        const original = this.processList.map(p => ({...p}));
        const rrScheduler = new SchedulerRR(original, quantum);
        const rrResult = rrScheduler.simulate();
        const srtfScheduler = new SchedulerSRTF(original.map(p => ({...p})));
        const srtfResult = srtfScheduler.simulate();

        GanttRenderer.draw(document.getElementById('rrCanvas'), rrResult.gantt);
        GanttRenderer.draw(document.getElementById('srtfCanvas'), srtfResult.gantt);

        this.renderMetricsTable('rrTableContainer', rrResult.processes);
        this.renderMetricsTable('srtfTableContainer', srtfResult.processes);

        const logDiv = document.getElementById('rrQueueLog');
        logDiv.innerHTML = rrResult.log.map(entry => `<div>${entry}</div>`).join('');

        const { comparisonText, conclusionText } = ComparisonEngine.compute(
            rrResult.processes, srtfResult.processes, quantum
        );
        document.getElementById('comparisonSummary').innerText = comparisonText;
        document.getElementById('conclusion').innerText = conclusionText;
    },

    renderMetricsTable(containerId, processes) {
        let html = `<table class="results-table">
            <tr><th>ID</th><th>Arrival</th><th>Burst</th><th>WT</th><th>TAT</th><th>RT</th></tr>`;
        let totalWT = 0, totalTAT = 0, totalRT = 0;
        processes.forEach(p => {
            const tat = p.completionTime - p.arrivalTime;
            const wt = tat - p.burstTime;
            const rt = p.startTime - p.arrivalTime;
            totalWT += wt; totalTAT += tat; totalRT += rt;
            html += `<tr><td>${p.id}</td><td>${p.arrivalTime}</td><td>${p.burstTime}</td>
                     <td>${wt}</td><td>${tat}</td><td>${rt}</td></tr>`;
        });
        const n = processes.length;
        html += `<tr><td colspan="3"><b>Averages</b></td>
                 <td><b>${(totalWT/n).toFixed(2)}</b></td>
                 <td><b>${(totalTAT/n).toFixed(2)}</b></td>
                 <td><b>${(totalRT/n).toFixed(2)}</b></td></tr>`;
        html += `</table>`;
        document.getElementById(containerId).innerHTML = html;
    }
};

// دوال عامة للـ HTML
function addProcess() { UI.addProcess(); }
function runSimulation() { UI.runSimulation(); }
function clearAll() { UI.clearAll(); }
function loadScenario(code) { UI.loadScenario(code); }