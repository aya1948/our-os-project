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

class SchedulerRR {
    constructor(processes, quantum) {
        this.processes = processes.map(p => new Process(p.id, p.arrivalTime, p.burstTime));
        this.quantum = quantum;
        this.ganttEntries = [];
        this.readyQueueLog = [];
    }

    simulate() {
        const procs = [...this.processes].sort((a, b) =>
            a.arrivalTime !== b.arrivalTime ? a.arrivalTime - b.arrivalTime : a.id - b.id
        );
        const readyQueue = [];
        let time = 0, index = 0, current = null, timeSlice = 0;

        while (index < procs.length || readyQueue.length > 0 || current !== null) {

            // Enqueue all processes that have arrived at or before current time
            while (index < procs.length && procs[index].arrivalTime <= time) {
                readyQueue.push(procs[index]);
                index++;
            }

            // Pick next process if CPU is free
            if (current === null && readyQueue.length > 0) {
                current = readyQueue.shift();
                timeSlice = 0;
                if (!current.started) {
                    current.startTime = time;
                    current.started = true;
                }
            }

            // Log ready queue state
            const readyIds = readyQueue.map(p => 'P' + p.id).join(', ');
            const runningStr = current ? 'P' + current.id : 'Idle';
            this.readyQueueLog.push('t=' + time + ' | Running: ' + runningStr + ' | Ready Queue: [' + readyIds + ']');

            // CPU idle
            if (current === null) {
                this.addOrExtendGantt(-1, time, 1);
                time++;
                continue;
            }

            // Execute one unit
            current.remainingTime--;
            timeSlice++;
            this.addOrExtendGantt(current.id, time, 1);
            time++;

            // Enqueue processes that arrived at the new time (after tick)
            while (index < procs.length && procs[index].arrivalTime <= time) {
                readyQueue.push(procs[index]);
                index++;
            }

            if (current.remainingTime === 0) {
                // Process finished
                current.completionTime = time;
                current = null;
                timeSlice = 0;
            } else if (timeSlice === this.quantum) {
                // Quantum expired — re-enqueue current AFTER newly arrived processes
                readyQueue.push(current);
                current = null;
                timeSlice = 0;
            }
        }

        return { processes: this.processes, gantt: this.ganttEntries, log: this.readyQueueLog };
    }

    addOrExtendGantt(processId, startTime, duration) {
        const endTime = startTime + duration;
        const len = this.ganttEntries.length;
        if (len === 0 || this.ganttEntries[len - 1].processId !== processId) {
            this.ganttEntries.push(new GanttEntry(processId, startTime, endTime));
        } else {
            this.ganttEntries[len - 1].endTime = endTime;
        }
    }
}
