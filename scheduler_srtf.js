class SchedulerSRTF {
    constructor(processes) {
        this.processes = processes.map(p => new Process(p.id, p.arrivalTime, p.burstTime));
        this.ganttEntries = [];
    }

    simulate() {
        const procs = [...this.processes].sort((a, b) =>
            a.arrivalTime !== b.arrivalTime ? a.arrivalTime - b.arrivalTime : a.id - b.id
        );
        const readyQueue = [];
        let time = 0, index = 0, current = null;

        const addToReady = (p) => {
            readyQueue.push(p);
            // Sort by remaining time, break ties by process ID
            readyQueue.sort((a, b) =>
                a.remainingTime !== b.remainingTime ? a.remainingTime - b.remainingTime : a.id - b.id
            );
        };

        while (index < procs.length || readyQueue.length > 0 || current !== null) {

            // Enqueue all processes that have arrived at or before current time
            while (index < procs.length && procs[index].arrivalTime <= time) {
                addToReady(procs[index]);
                index++;
            }

            // Preemption check: if a shorter job is available, preempt current
            if (current !== null && readyQueue.length > 0) {
                const shortest = readyQueue[0];
                if (shortest.remainingTime < current.remainingTime) {
                    addToReady(current);
                    current = readyQueue.shift();
                    if (!current.started) {
                        current.startTime = time;
                        current.started = true;
                    }
                }
            }

            // Pick next process if CPU is free
            if (current === null && readyQueue.length > 0) {
                current = readyQueue.shift();
                if (!current.started) {
                    current.startTime = time;
                    current.started = true;
                }
            }

            // CPU idle
            if (current === null) {
                this.addOrExtendGantt(-1, time, 1);
                time++;
                continue;
            }

            // Execute one unit
            current.remainingTime--;
            this.addOrExtendGantt(current.id, time, 1);
            time++;

            if (current.remainingTime === 0) {
                current.completionTime = time;
                current = null;
            }
        }

        return { processes: this.processes, gantt: this.ganttEntries };
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
