# Round Robin vs SRTF 

## Project Description
This project simulates two CPU scheduling algorithms: **Round Robin (RR)** and **Shortest Remaining Time First (SRTF)**.  
Both algorithms run on the same workload, and the results are compared to analyze fairness, efficiency, and the effect of time quantum.

## How to Run
1. Download or clone this repository.
2. Open `index.html` in a modern web browser (Chrome, Firefox, Edge).
3. No server or installation required – the simulation runs entirely in the browser.

## Using the Simulator
- Enter Process ID, Arrival Time, Burst Time and click **Add Process**.
- Set a **Time Quantum** (positive integer).
- Click **Run Simulation** to see Gantt charts for both algorithms, detailed metrics, and a comparison.
- Use the built‑in **Test Scenario** buttons to quickly load sample workloads.

## Project Structure
- `index.html` – Main interface
- `style.css` – Styling
- `scheduler_rr.js` – Round Robin algorithm and data models
- `scheduler_srtf.js` – SRTF algorithm
- `ui_controller.js` – UI logic, Gantt rendering, comparison engine

## Screenshots
- `screenshots/interface.png` – Main interface with input panel
- `screenshots/rr_gantt.png` – Round Robin Gantt chart
- `screenshots/srtf_gantt.png` – SRTF Gantt chart
- `screenshots/comparison.png` – Comparison summary and conclusion

## Test Scenarios
- **Scenario A** – Basic mixed workload (different arrival/burst times)
- **Scenario B** – Quantum sensitivity (large quantum vs small)
- **Scenario C** – Short‑job‑heavy (SRTF advantage visible)
- **Scenario D** – Interactive fairness (RR gives faster first response)
