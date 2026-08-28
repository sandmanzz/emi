// This is the single source of truth for an event's lifecycle stages. The Event
// Detail stepper reads this list directly (ordered by `order`) — however many rows
// exist here is however many steps the stepper shows. `scan: 'Scan'` on a row means
// items must be scanned while the event is at that stage, and the per-item Scan
// button on Event Detail only appears while the event is at a stage with `scan: 'Scan'`.
export const initialStatuses = [
  { id:1, order:1, status:'Created by admin up',  scan:'None', eventRunning:0,  updatedAt:'2024-01-10' },
  { id:2, order:2, status:'On preparing items',   scan:'None', eventRunning:2,  updatedAt:'2024-01-10' },
  { id:3, order:3, status:'Finish setup',          scan:'None', eventRunning:1,  updatedAt:'2024-01-12' },
  { id:4, order:4, status:'Waiting scan in',       scan:'Scan', eventRunning:3,  updatedAt:'2024-01-15' },
  { id:5, order:5, status:'Event running',         scan:'None', eventRunning:5,  updatedAt:'2024-02-01' },
  { id:6, order:6, status:'Waiting scan out',      scan:'Scan', eventRunning:2,  updatedAt:'2024-02-05' },
  { id:7, order:7, status:'Finished',              scan:'None', eventRunning:12, updatedAt:'2024-02-10' },
  { id:8, order:8, status:'Postphone',             scan:'None', eventRunning:1,  updatedAt:'2024-03-01' },
  { id:9, order:9, status:'Disable',               scan:'None', eventRunning:0,  updatedAt:'2024-03-05' },
];
