/*****************************************
 * Gantt Renderer + Comparison + UI
 *****************************************/
class GanttRenderer {
    static draw(canvas, entries) {
        if (!entries || entries.length === 0) return;
        const maxTime = entries[entries.length - 1].endTime;
        const pixelsPerUnit = Math.max(30, Math.floor(700 / (maxTime || 1)));
        const width = maxTime * pixelsPerUnit + 40;
        canvas.width = width;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barHeight = 40;
        const colors = ['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40','#C9CBCF'];
        const colorMap = {};
        let colorIndex = 0;
        const getColor = (pid) => {
            if (pid === -1) return '#D3D3D3';
            if (colorMap[pid] === undefined) {
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
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, 0, w, barHeight);
            ctx.fillStyle = '#000';
            ctx.font = 'bold 12px Arial';
            const label = e.processId === -1 ? 'Idle' : 'P' + e.processId;
            if (w > 18) {
                ctx.fillText(label, x + w / 2 - ctx.measureText(label).width / 2, barHeight - 12);
            }
        });

        // Time markers
        ctx.font = '11px Arial';
        ctx.fillStyle = '#000';
        for (let t = 0; t <= maxTime; t++) {
            const x = t * pixelsPerUnit;
            ctx.beginPath();
            ctx.moveTo(x, barHeight);
            ctx.lineTo(x, barHeight + 6);
            ctx.strokeStyle = '#555';
            ctx.stroke();
            ctx.fillText(t, x - 4, barHeight + 18);
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

        const rrWT   = rrProcesses.map(p => p.completionTime - p.arrivalTime - p.burstTime);
        const rrTAT  = rrProcesses.map(p => p.completionTime - p.arrivalTime);
        const rrRT   = rrProcesses.map(p => p.startTime - p.arrivalTime);
        const srtfWT  = srtfProcesses.map(p => p.completionTime - p.arrivalTime - p.burstTime);
        const srtfTAT = srtfProcesses.map(p => p.completionTime - p.arrivalTime);
        const srtfRT  = srtfProcesses.map(p => p.startTime - p.arrivalTime);

        const rrAvgWT = avg(rrWT),   srtfAvgWT = avg(srtfWT);
        const rrAvgTAT = avg(rrTAT), srtfAvgTAT = avg(srtfTAT);
        const rrAvgRT = avg(rrRT),   srtfAvgRT = avg(srtfRT);
        const rrStdTAT = stdDev(rrTAT), srtfStdTAT = stdDev(srtfTAT);

        const pad = (s, n) => String(s).padEnd(n);

        let comp = '=== Comparison (Same Workload, Quantum = ' + quantum + ') ===\n\n';
        comp += pad('Metric', 20) + '| ' + pad('Round Robin', 14) + '| SRTF\n';
        comp += '-'.repeat(50) + '\n';
        comp += pad('Avg Waiting Time', 20) + '| ' + pad(rrAvgWT.toFixed(2), 14) + '| ' + srtfAvgWT.toFixed(2) + '\n';
        comp += pad('Avg Turnaround', 20) + '| ' + pad(rrAvgTAT.toFixed(2), 14) + '| ' + srtfAvgTAT.toFixed(2) + '\n';
        comp += pad('Avg Response Time', 20) + '| ' + pad(rrAvgRT.toFixed(2), 14) + '| ' + srtfAvgRT.toFixed(2) + '\n';
        comp += pad('TAT Std Dev', 20) + '| ' + pad(rrStdTAT.toFixed(2), 14) + '| ' + srtfStdTAT.toFixed(2) + '  (lower = fairer)\n';

        let concl = '=== Final Conclusion ===\n\n';
        concl += '1. Waiting Time: ';
        if (rrAvgWT < srtfAvgWT)       concl += 'Round Robin achieved lower average waiting time.\n';
        else if (srtfAvgWT < rrAvgWT)  concl += 'SRTF achieved lower average waiting time (short jobs finish quickly).\n';
        else                            concl += 'Both algorithms produced identical average waiting time.\n';

        concl += '2. Response Time: ';
        if (rrAvgRT < srtfAvgRT)       concl += 'Round Robin delivered faster first response due to time-slicing.\n';
        else if (srtfAvgRT < rrAvgRT)  concl += 'SRTF delivered faster response time (short jobs start immediately).\n';
        else                            concl += 'Both algorithms produced similar response times.\n';

        concl += '3. Fairness (TAT Std Dev): ';
        if (rrStdTAT <= srtfStdTAT)   concl += 'Round Robin is fairer — less variation in turnaround times.\n';
        else                            concl += 'SRTF shows more variation; long jobs may be delayed (starvation risk).\n';

        concl += '4. Effect of Quantum (RR = ' + quantum + '): A smaller quantum improves response time but increases context switches; a larger quantum approaches FCFS behavior.\n';

        concl += '\nRecommendation: ';
        if (rrAvgWT <= srtfAvgWT && rrAvgRT <= srtfAvgRT) {
            concl += 'Round Robin is recommended — it balances response and waiting time fairly.';
        } else if (srtfAvgWT < rrAvgWT && srtfAvgRT < rrAvgRT) {
            concl += 'SRTF is recommended — it minimizes waiting and turnaround time efficiently.';
        } else {
            concl += 'The best choice depends on priority: use Round Robin for fairness and interactive response; use SRTF for throughput efficiency when short jobs dominate.';
        }

        return { comparisonText: comp, conclusionText: concl };
    }
}

const UI = {
    processList: [],

    loadScenario(code) {
        this.clearAll();
        let data = [];
        let quantum = 2;

        switch (code) {
            case 'A': // Normal mixed workload
                data = [{id:1,arr:0,burst:5},{id:2,arr:1,burst:3},{id:3,arr:2,burst:8},{id:4,arr:3,burst:6}];
                quantum = 2;
                break;
            case 'B': // Behavior-revealing: quantum sensitivity
                data = [{id:1,arr:0,burst:10},{id:2,arr:1,burst:5},{id:3,arr:3,burst:8}];
                quantum = 4;
                break;
            case 'C': // Short-job heavy — reveals SRTF advantage
                data = [{id:1,arr:0,burst:2},{id:2,arr:0,burst:3},{id:3,arr:0,burst:1},{id:4,arr:0,burst:12}];
                quantum = 1;
                break;
            case 'D': // Fairness test
                data = [{id:1,arr:0,burst:4},{id:2,arr:1,burst:2},{id:3,arr:3,burst:1},{id:4,arr:5,burst:3}];
                quantum = 1;
                break;
        }

        data.forEach(d => this.processList.push(new Process(d.id, d.arr, d.burst)));
        this.updateTable();
        document.getElementById('quantum').value = quantum;
    },

    addProcess() {
        const pidVal   = document.getElementById('pid').value.trim();
        const arrVal   = document.getElementById('arrival').value.trim();
        const burstVal = document.getElementById('burst').value.trim();

        if (!pidVal || !arrVal || !burstVal) {
            alert('All fields (ID, Arrival, Burst) must be filled.');
            return;
        }
        if (!/^\d+$/.test(pidVal) || !/^\d+$/.test(arrVal) || !/^\d+$/.test(burstVal)) {
            alert('All inputs must be non-negative integers.');
            return;
        }

        const id = parseInt(pidVal), arrival = parseInt(arrVal), burstTime = parseInt(burstVal);

        if (id <= 0)        { alert('Process ID must be a positive integer.'); return; }
        if (arrival < 0)    { alert('Arrival time cannot be negative.'); return; }
        if (burstTime <= 0) { alert('Burst time must be greater than 0.'); return; }
        if (this.processList.some(p => p.id === id)) {
            alert('Process ID ' + id + ' already exists. IDs must be unique.');
            return;
        }

        this.processList.push(new Process(id, arrival, burstTime));
        this.updateTable();
        document.getElementById('pid').value    = '';
        document.getElementById('arrival').value = '';
        document.getElementById('burst').value   = '';
        document.getElementById('pid').focus();
    },

    updateTable() {
        const tbody = document.querySelector('#processTable tbody');
        tbody.innerHTML = '';
        this.processList.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td>' + p.id + '</td><td>' + p.arrivalTime + '</td><td>' + p.burstTime + '</td>';
            tbody.appendChild(tr);
        });
    },

    clearAll() {
        this.processList = [];
        this.updateTable();
        const qEl = document.getElementById('quantum');
        if (qEl) qEl.value = '';
        ['rrCanvas','srtfCanvas'].forEach(id => {
            const c = document.getElementById(id);
            if (c) { c.getContext('2d').clearRect(0, 0, c.width, c.height); c.width = 0; }
        });
        ['rrTableContainer','srtfTableContainer','rrQueueLog','comparisonSummary','conclusion'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });
    },

    runSimulation() {
        if (this.processList.length === 0) {
            alert('Please add at least one process before running.');
            return;
        }
        const qVal = document.getElementById('quantum').value.trim();
        if (!qVal || !/^\d+$/.test(qVal)) {
            alert('Time quantum must be a positive integer.');
            return;
        }
        const quantum = parseInt(qVal);
        if (quantum <= 0) {
            alert('Time quantum must be greater than 0.');
            return;
        }

        // Pass plain data objects — schedulers create their own Process instances
        const original = this.processList.map(p => ({ id: p.id, arrivalTime: p.arrivalTime, burstTime: p.burstTime }));

        const rrScheduler   = new SchedulerRR(original, quantum);
        const rrResult      = rrScheduler.simulate();

        const srtfScheduler = new SchedulerSRTF(original.map(p => Object.assign({}, p)));
        const srtfResult    = srtfScheduler.simulate();

        GanttRenderer.draw(document.getElementById('rrCanvas'),   rrResult.gantt);
        GanttRenderer.draw(document.getElementById('srtfCanvas'), srtfResult.gantt);

        this.renderMetricsTable('rrTableContainer',   rrResult.processes);
        this.renderMetricsTable('srtfTableContainer', srtfResult.processes);

        const logDiv = document.getElementById('rrQueueLog');
        logDiv.innerHTML = rrResult.log.map(entry => '<div>' + entry + '</div>').join('');

        const { comparisonText, conclusionText } = ComparisonEngine.compute(
            rrResult.processes, srtfResult.processes, quantum
        );
        document.getElementById('comparisonSummary').innerText = comparisonText;
        document.getElementById('conclusion').innerText        = conclusionText;
    },

    renderMetricsTable(containerId, processes) {
        let html = '<table class="results-table">' +
            '<tr><th>PID</th><th>Arrival</th><th>Burst</th><th>Start</th><th>Completion</th><th>WT</th><th>TAT</th><th>RT</th></tr>';
        let totalWT = 0, totalTAT = 0, totalRT = 0;
        processes.forEach(p => {
            const tat = p.completionTime - p.arrivalTime;
            const wt  = tat - p.burstTime;
            const rt  = p.startTime - p.arrivalTime;
            totalWT += wt; totalTAT += tat; totalRT += rt;
            html += '<tr>' +
                '<td>' + p.id + '</td>' +
                '<td>' + p.arrivalTime + '</td>' +
                '<td>' + p.burstTime + '</td>' +
                '<td>' + p.startTime + '</td>' +
                '<td>' + p.completionTime + '</td>' +
                '<td>' + wt + '</td>' +
                '<td>' + tat + '</td>' +
                '<td>' + rt + '</td>' +
                '</tr>';
        });
        const n = processes.length;
        html += '<tr><td colspan="5"><b>Averages</b></td>' +
            '<td><b>' + (totalWT/n).toFixed(2) + '</b></td>' +
            '<td><b>' + (totalTAT/n).toFixed(2) + '</b></td>' +
            '<td><b>' + (totalRT/n).toFixed(2) + '</b></td></tr>';
        html += '</table>';
        document.getElementById(containerId).innerHTML = html;
    }
};

// Global functions wired to HTML
function addProcess()       { UI.addProcess(); }
function runSimulation()    { UI.runSimulation(); }
function clearAll()         { UI.clearAll(); }
function loadScenario(code) { UI.loadScenario(code); }
