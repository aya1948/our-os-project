// ==================== Model ====================
class Process {
    constructor(id, arrivalTime, burstTime) {
        this.id = id;
        this.arrivalTime = arrivalTime;
        this.burstTime = burstTime;
        this.remainingTime = burstTime;
        this.startTime = null;
        this.completionTime = null;
        this.started = false;
    }
}

class GanttEntry {
    constructor(processId, startTime, endTime) {
        this.processId = processId;
        this.startTime = startTime;
        this.endTime = endTime;
    }
}

// ==================== Round Robin Scheduler ====================
class SchedulerRR {
    constructor(processes, quantum) {
        this.processes = processes.map(p => new Process(p.id, p.arrivalTime, p.burstTime));
        this.quantum = quantum;
        this.ganttEntries = [];
        this.readyQueueLog = [];
    }

    simulate() {
        const procs = [...this.processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
        const readyQueue = [];
        let time = 0, index = 0, current = null, timeSlice = 0;

        while (index < procs.length || readyQueue.length > 0 || current !== null) {
            while (index < procs.length && procs[index].arrivalTime <= time) {
                readyQueue.push(procs[index]);
                index++;
            }

            if (current === null && readyQueue.length > 0) {
                current = readyQueue.shift();
                timeSlice = 0;
                if (!current.started) {
                    current.startTime = time;
                    current.started = true;
                }
            }

            const readyIds = readyQueue.map(p => `P${p.id}`).join(', ');
            const runningStr = current ? `P${current.id}` : 'idle';
            this.readyQueueLog.push(`t=${time} Ready: [${readyIds}] Running: ${runningStr}`);

            if (current === null) {
                this._addOrExtendGantt(-1, time, 1);
                time++;
                continue;
            }

            current.remainingTime--;
            timeSlice++;
            this._addOrExtendGantt(current.id, time, 1);
            time++;

            if (current.remainingTime === 0) {
                current.completionTime = time;
                current = null;
                timeSlice = 0;
            } else if (timeSlice === this.quantum) {
                while (index < procs.length && procs[index].arrivalTime <= time) {
                    readyQueue.push(procs[index]);
                    index++;
                }
                readyQueue.push(current);
                current = null;
                timeSlice = 0;
            }
        }
        return { processes: this.processes, gantt: this.ganttEntries, log: this.readyQueueLog };
    }

    _addOrExtendGantt(processId, startTime, duration) {
        const endTime = startTime + duration;
        const len = this.ganttEntries.length;
        if (len === 0 || this.ganttEntries[len - 1].processId !== processId) {
            this.ganttEntries.push(new GanttEntry(processId, startTime, endTime));
        } else {
            this.ganttEntries[len - 1].endTime = endTime;
        }
    }
}