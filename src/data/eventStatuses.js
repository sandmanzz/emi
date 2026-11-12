// This is the single source of truth for an event's lifecycle stages. The Event
// Detail stepper reads this list directly (ordered by `order`) — however many rows
// exist here is however many steps the stepper shows. `scan: 'Scan'` on a row means
// items must be scanned while the event is at that stage, and the per-item Scan
// button on Event Detail only appears while the event is at a stage with `scan: 'Scan'`.
// `productionItem: true` means that while an event is at that stage, Event Detail
// shows a "Request Production" action (ask for a new item to be produced, or convert one).
// `checkOwnership: true` means that when the event LEAVES that stage (Next), Event Detail
// first asks whether any item needs an ownership change (see EventDetailPage flow steps).
// `allowDelete: false` means items can't be deleted from an event while it is at that stage
// (added 2026-10-16). A missing field counts as true, so lists saved before it keep working.
// `closeStage: true` (2026-11-12): the event is finished here; the main action becomes "Start Checking"
// (closing flow: Ready for Checking → For Return → Partial Return / Returned & Completed). Seed: Finished.
// Stock Return is now optional and off in the seed: cut stock comes back at "For Return".
// `cuttingStock: true` (back 2026-11-12) / `stockReturn: true`: crossing into that stage really deducts /
// returns the event's stock (lib/eventStockCuts.js). One stage each, never the same stage. Seed: cut at
// Waiting scan in (loading), return at Waiting scan out (unloading).
// `allowAddItem: false` (2026-11-12): no items can be added at that stage (Add Item, Rent, Outsource,
// Production). Seed: off from Waiting scan in to Finished, so nothing is added once loading starts.
// `checkItem: true` (2026-11-11): items get a "Checking" tick box at that stage; it is hidden before the
// event reaches the first such stage. Seed: Finish setup (check every item after setting up).
// `outsourceItem: true` (2026-11-02) does the same for "Outsource Item" (Master Data → Outsource).
// `loanItem: true` means that while an event is at that stage, Event Detail shows "Borrow Item"
// (rent items from a loan vendor). Missing field = false. Added 2026-10-16.
// `cuttingStock` / `stockReturn` are legacy flags: no longer editable in Event Settings
// (removed 2026-10-05 / 2026-10-09). Event Detail still has dormant code for them; seed = false.
export const initialStatuses = [
  { id:1, order:1, code:'CBA',  status:'Created by admin up',  scan:'None', closeStage:false, cuttingStock:false, stockReturn:false, productionItem:false, checkItem:false, checkOwnership:false, allowAddItem:true, allowDelete:true, loanItem:true, outsourceItem:true, eventRunning:0,  updatedAt:'2024-01-10' },
  { id:2, order:2, code:'OPI',  status:'On preparing items',   scan:'None', closeStage:false, cuttingStock:false, stockReturn:false, productionItem:true, checkItem:false, checkOwnership:false, allowAddItem:true, allowDelete:true, loanItem:true, outsourceItem:true, eventRunning:2,  updatedAt:'2024-01-10' },
  { id:3, order:3, code:'FS',   status:'Finish setup',          scan:'None', closeStage:false, cuttingStock:false, stockReturn:false, productionItem:true, checkItem:true, checkOwnership:true, allowAddItem:true, allowDelete:true, loanItem:true, outsourceItem:true, eventRunning:1,  updatedAt:'2024-01-12' },
  { id:4, order:4, code:'WSI',  status:'Waiting scan in',       scan:'Scan', closeStage:false, cuttingStock:true, stockReturn:false, productionItem:false, checkItem:false, checkOwnership:false, allowAddItem:false, allowDelete:false, loanItem:false, outsourceItem:false, eventRunning:3,  updatedAt:'2024-01-15' },
  { id:5, order:5, code:'ER',   status:'Event running',         scan:'None', closeStage:false, cuttingStock:false, stockReturn:false, productionItem:false, checkItem:false, checkOwnership:false, allowAddItem:false, allowDelete:false, loanItem:false, outsourceItem:false, eventRunning:5,  updatedAt:'2024-02-01' },
  { id:6, order:6, code:'WSO',  status:'Waiting scan out',      scan:'Scan', closeStage:false, cuttingStock:false, stockReturn:false, productionItem:false, checkItem:false, checkOwnership:false, allowAddItem:false, allowDelete:false, loanItem:false, outsourceItem:false, eventRunning:2,  updatedAt:'2024-02-05' },
  { id:7, order:7, code:'FIN',  status:'Finished',              scan:'None', closeStage:true, cuttingStock:false, stockReturn:false, productionItem:false, checkItem:false, checkOwnership:false, allowAddItem:false, allowDelete:false, loanItem:false, outsourceItem:false, eventRunning:12, updatedAt:'2024-02-10' },
  { id:8, order:8, code:'PP',   status:'Postphone',             scan:'None', closeStage:false, cuttingStock:false, stockReturn:false, productionItem:false, checkItem:false, checkOwnership:false, allowAddItem:true, allowDelete:true, loanItem:false, outsourceItem:false, eventRunning:1,  updatedAt:'2024-03-01' },
  { id:9, order:9, code:'DIS',  status:'Disable',               scan:'None', closeStage:false, cuttingStock:false, stockReturn:false, productionItem:false, checkItem:false, checkOwnership:false, allowAddItem:true, allowDelete:true, loanItem:false, outsourceItem:false, eventRunning:0,  updatedAt:'2024-03-05' },
];
