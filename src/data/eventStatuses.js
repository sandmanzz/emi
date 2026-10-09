// This is the single source of truth for an event's lifecycle stages. The Event
// Detail stepper reads this list directly (ordered by `order`) — however many rows
// exist here is however many steps the stepper shows. `scan: 'Scan'` on a row means
// items must be scanned while the event is at that stage, and the per-item Scan
// button on Event Detail only appears while the event is at a stage with `scan: 'Scan'`.
// `productionItem: true` means that while an event is at that stage, Event Detail
// shows a "Request Production" action (ask for a new item to be produced, or convert one).
// `checkOwnership: true` means that when the event LEAVES that stage (Next), Event Detail
// first asks whether any item needs an ownership change (see EventDetailPage flow steps).
// `cuttingStock` / `stockReturn` are legacy flags: no longer editable in Event Settings
// (removed 2026-10-05 / 2026-10-09). Event Detail still has dormant code for them; seed = false.
export const initialStatuses = [
  { id:1, order:1, code:'CBA',  status:'Created by admin up',  scan:'None', cuttingStock:false, stockReturn:false, productionItem:false, checkOwnership:false, eventRunning:0,  updatedAt:'2024-01-10' },
  { id:2, order:2, code:'OPI',  status:'On preparing items',   scan:'None', cuttingStock:false, stockReturn:false, productionItem:true, checkOwnership:false, eventRunning:2,  updatedAt:'2024-01-10' },
  { id:3, order:3, code:'FS',   status:'Finish setup',          scan:'None', cuttingStock:false, stockReturn:false, productionItem:true, checkOwnership:true, eventRunning:1,  updatedAt:'2024-01-12' },
  { id:4, order:4, code:'WSI',  status:'Waiting scan in',       scan:'Scan', cuttingStock:false, stockReturn:false, productionItem:false, checkOwnership:false, eventRunning:3,  updatedAt:'2024-01-15' },
  { id:5, order:5, code:'ER',   status:'Event running',         scan:'None', cuttingStock:false, stockReturn:false, productionItem:false, checkOwnership:false, eventRunning:5,  updatedAt:'2024-02-01' },
  { id:6, order:6, code:'WSO',  status:'Waiting scan out',      scan:'Scan', cuttingStock:false, stockReturn:false, productionItem:false, checkOwnership:false, eventRunning:2,  updatedAt:'2024-02-05' },
  { id:7, order:7, code:'FIN',  status:'Finished',              scan:'None', cuttingStock:false, stockReturn:false, productionItem:false, checkOwnership:false, eventRunning:12, updatedAt:'2024-02-10' },
  { id:8, order:8, code:'PP',   status:'Postphone',             scan:'None', cuttingStock:false, stockReturn:false, productionItem:false, checkOwnership:false, eventRunning:1,  updatedAt:'2024-03-01' },
  { id:9, order:9, code:'DIS',  status:'Disable',               scan:'None', cuttingStock:false, stockReturn:false, productionItem:false, checkOwnership:false, eventRunning:0,  updatedAt:'2024-03-05' },
];
