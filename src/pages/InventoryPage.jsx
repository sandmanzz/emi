import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../components/Pagination';
import SortTh from '../components/SortTh';
import SearchableSelect from '../components/SearchableSelect';
import { IconSearch, IconPlus, IconEdit, IconDelete, IconClose } from '../components/icons';
import { categories, stockStatuses } from '../data/inventory';
import { getCatalog, markItemSetUp } from '../lib/producedItems';

function ImgCell({ src, name, onClick }) {
  return (
    <div
      onClick={onClick}
      title="View image"
      style={{ width:42, height:42, background:'var(--bg)', borderRadius:'var(--r)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--border)', margin:'auto', cursor:'pointer', transition:'background .15s' }}
      onMouseEnter={e => e.currentTarget.style.background='#e2e8f0'}
      onMouseLeave={e => e.currentTarget.style.background='var(--bg)'}
    >
      {src
        ? <img src={src} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'var(--r)' }} />
        : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width:18, height:18 }}>
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        )
      }
    </div>
  );
}

function ImageViewerModal({ open, name, src, onClose }) {
  if (!open) return null;
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
    >
      <div style={{ background:'#fff', borderRadius:14, maxWidth:480, width:'100%', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
          <span style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>{name}</span>
          <button className="modal-close" onClick={onClose}><IconClose /></button>
        </div>
        <div style={{ padding:24, display:'flex', alignItems:'center', justifyContent:'center', minHeight:220, background:'var(--bg)' }}>
          {src
            ? <img src={src} alt={name} style={{ maxWidth:'100%', maxHeight:320, borderRadius:8, objectFit:'contain' }} />
            : (
              <div style={{ textAlign:'center', color:'var(--text-muted)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ width:56, height:56, marginBottom:12, color:'var(--border)' }}>
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <p style={{ fontSize:13, fontWeight:500 }}>No image uploaded</p>
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

function stockBadge(s) {
  if (s === 'Available')    return <span className="badge badge-green">{s}</span>;
  if (s === 'Low Stock')    return <span className="badge badge-orange">{s}</span>;
  if (s === 'Out of Stock') return <span className="badge badge-red">{s}</span>;
  return <span className="badge badge-gray">{s}</span>;
}

export default function InventoryPage() {
  const navigate = useNavigate();
  const [query,       setQuery]       = useState('');
  const [catFilter,   setCatFilter]   = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [page,        setPage]        = useState(1);
  const [sortCol,     setSortCol]     = useState(0);
  const [sortAsc,     setSortAsc]     = useState(true);
  const [imgPopup,    setImgPopup]    = useState({ open:false, name:'', src:null });
  // Static seed items + items created by finished production requests (see lib/producedItems.js).
  const [inventoryData, setInventoryData] = useState(() => getCatalog());
  const [setupOnly,   setSetupOnly]   = useState(false);
  const needsSetupCount = inventoryData.filter(r => r.needsSetup).length;

  function markSetUp(name) {
    markItemSetUp(name);
    const next = getCatalog();
    setInventoryData(next);
    if (!next.some(r => r.needsSetup)) setSetupOnly(false); // nothing left to filter on
  }

  const sortKeys = ['name','sku','category','unit','warehouse','totalStock','stockStatus','updatedAt'];

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const key = sortKeys[sortCol] || 'name';
    return inventoryData
      .filter(r => {
        const mQ = !q || r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q);
        const mC = !catFilter   || r.category    === catFilter;
        const mS = !stockFilter || r.stockStatus === stockFilter;
        const mU = !setupOnly || r.needsSetup;
        return mQ && mC && mS && mU;
      })
      .sort((a, b) => {
        const va = String(a[key] ?? ''), vb = String(b[key] ?? '');
        return sortAsc ? va.localeCompare(vb, undefined, { numeric:true }) : vb.localeCompare(va, undefined, { numeric:true });
      });
  }, [inventoryData, query, catFilter, stockFilter, setupOnly, sortCol, sortAsc]);

  function handleSort(col) {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(true); }
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageData   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const availableCount  = inventoryData.filter(r => r.stockStatus === 'Available').length;
  const lowStockCount   = inventoryData.filter(r => r.stockStatus === 'Low Stock').length;
  const outOfStockCount = inventoryData.filter(r => r.stockStatus === 'Out of Stock').length;

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
        <h1 className="page-title" style={{ margin:0 }}>Inventory</h1>
        <button className="btn-new"><IconPlus /> New Item</button>
      </div>

      {needsSetupCount > 0 && (
        <div className="setup-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div><strong>{needsSetupCount} item{needsSetupCount === 1 ? '' : 's'} created from production still need{needsSetupCount === 1 ? 's' : ''} setup.</strong> Their SKU is temporary and category and unit are empty. Complete the information, then tick &ldquo;Mark as set up&rdquo;.</div>
          <button type="button" className="btn btn-ghost" onClick={() => { setSetupOnly(s => !s); setPage(1); }}>{setupOnly ? 'Show all' : 'Show only these'}</button>
        </div>
      )}

      {/* Stats */}
      <div className="stats-bar" style={{ gridTemplateColumns:'repeat(4,1fr)' }}>
        {[
          { label:'Total Items',  value:inventoryData.length, color:'var(--brand)',  bg:'var(--brand-bg)' },
          { label:'Available',    value:availableCount,        color:'var(--green)',  bg:'var(--green-bg)' },
          { label:'Low Stock',    value:lowStockCount,         color:'var(--orange)', bg:'var(--orange-bg)' },
          { label:'Out of Stock', value:outOfStockCount,       color:'var(--red)',    bg:'var(--red-bg)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background:s.bg }}>
              <span className="stat-value" style={{ color:s.color }}>{s.value}</span>
            </div>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-wrap">
              <IconSearch />
              <input
                className="search-input" type="text" placeholder="Search name or SKU…"
                value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
              />
            </div>
            <SearchableSelect
              inline
              value={catFilter}
              onChange={v => { setCatFilter(v); setPage(1); }}
              options={[{ value: '', label: 'All Categories' }, ...categories.map(c => ({ value: c, label: c }))]}
              placeholder="All Categories"
            />
            <SearchableSelect
              inline
              value={stockFilter}
              onChange={v => { setStockFilter(v); setPage(1); }}
              options={[{ value: '', label: 'All Status' }, ...stockStatuses.map(s => ({ value: s, label: s }))]}
              placeholder="All Status"
            />
            <button className="btn-search">Search</button>
          </div>
          <div className="toolbar-right">
            <button className="btn-new"><IconPlus /> New</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh label="Name"         colIndex={0} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="SKU"          colIndex={1} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:90 }} />
                <SortTh label="Category"     colIndex={2} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:105 }} />
                <SortTh label="Unit"         colIndex={3} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:70 }} />
                <SortTh label="Warehouse"    colIndex={4} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ minWidth:120 }} />
                <SortTh label="Total Stock"  colIndex={5} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:90, textAlign:'right' }} />
                <SortTh label="Status"       colIndex={6} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:110 }} />
                <SortTh label="Updated At"   colIndex={7} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:100 }} />
                <th style={{ width:60, textAlign:'center' }}>Image</th>
                <th style={{ width:80, textAlign:'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={10} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>No results found.</td></tr>
                : pageData.map(r => (
                  <tr key={r.id} className={r.needsSetup ? 'row-needs-setup' : undefined}>
                    <td className="name-cell">
                      {r.name}
                      {r.needsSetup && <span className="badge badge-orange needs-setup-chip" title="Created from a production request — complete its information">Needs setup</span>}
                    </td>
                    <td className="id-cell">{r.sku}</td>
                    <td>
                      {r.category
                        ? <span className="badge badge-gray" style={{ fontSize:'10.5px' }}>{r.category}</span>
                        : <span className="setup-missing">Not set</span>}
                    </td>
                    <td style={{ color:'var(--text-muted)', fontSize:'12.5px' }}>{r.unit || <span className="setup-missing">Not set</span>}</td>
                    <td>{r.warehouse}</td>
                    <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:600 }}>{r.totalStock}</td>
                    <td>{stockBadge(r.stockStatus)}</td>
                    <td style={{ color:'var(--text-muted)', fontSize:'12.5px' }}>{r.updatedAt === '-' ? '—' : r.updatedAt}</td>
                    <td style={{ textAlign:'center' }}>
                      <ImgCell
                        src={r.image || null}
                        name={r.name}
                        onClick={() => setImgPopup({ open:true, name:r.name, src:r.image || null })}
                      />
                    </td>
                    <td>
                      <div className="action-btns" style={{ justifyContent:'center' }}>
                        <button className="btn-icon" title="View Detail" style={{ color:'var(--brand)' }} onClick={() => navigate(`/inventory-detail?id=${r.id}`)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:14, height:14 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        {r.needsSetup && (
                          <button className="btn-icon" title="Mark as set up (information completed)" style={{ color:'var(--green)' }} onClick={() => markSetUp(r.name)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width:14, height:14 }}><polyline points="20 6 9 17 4 12"/></svg>
                          </button>
                        )}
                        <button className="btn-icon edit"   title="Edit"><IconEdit /></button>
                        <button className="btn-icon delete" title="Delete"><IconDelete /></button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={p => setPage(p)} label="items" />
      </div>

      <ImageViewerModal
        open={imgPopup.open}
        name={imgPopup.name}
        src={imgPopup.src}
        onClose={() => setImgPopup(p => ({ ...p, open:false }))}
      />
    </>
  );
}
