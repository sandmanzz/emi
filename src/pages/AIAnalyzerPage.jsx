import { useEffect, useMemo, useRef, useState } from 'react';
import { IconClose, IconPlus, IconSearch } from '../components/icons';

const PROJECT_OPTIONS = [
  { id: 'wsg-2026', name: 'Wedding Spring Garden', location: 'Bogor', date: '10-11 May 2026' },
  { id: 'cs26-2026', name: 'Corporate Summit 2026', location: 'Jakarta', date: '1-3 Jun 2026' },
  { id: 'wbs-2026', name: 'Wedding Bali Season', location: 'Bali', date: '14-15 Jul 2026' },
  { id: 'fmn-2026', name: 'Festival Musik Nusantara', location: 'Surabaya', date: '17-19 Aug 2026' },
];

const WAREHOUSE_COLUMNS = ['Gudang Bali 66', 'Gudang Bali 70', 'Gudang C9'];

const PRICE_BOOK = {
  'Backdrop Floral 3x2m': 1250000,
  'Kain Putih 3m': 285000,
  'Standing Flower Tall': 640000,
  'Kursi Tiffany': 165000,
  'Lampu LED Warm White': 48000,
  'Table Runner Gold': 74000,
  'Photobooth Frame': 1850000,
  'Tealight Holder 15cm': 29000,
  'Crystal Chandelier Drop': 2650000,
};

const WAREHOUSE_STOCK = {
  'Backdrop Floral 3x2m': {
    unit: 'pcs',
    warehouses: { 'Gudang Bali 66': 2, 'Gudang Bali 70': 3, 'Gudang C9': 0 },
  },
  'Kain Putih 3m': {
    unit: 'roll',
    warehouses: { 'Gudang Bali 66': 40, 'Gudang Bali 70': 66, 'Gudang C9': 14 },
  },
  'Standing Flower Tall': {
    unit: 'pcs',
    warehouses: { 'Gudang Bali 66': 8, 'Gudang Bali 70': 14, 'Gudang C9': 4 },
  },
  'Kursi Tiffany': {
    unit: 'pcs',
    warehouses: { 'Gudang Bali 66': 140, 'Gudang Bali 70': 190, 'Gudang C9': 10 },
  },
  'Lampu LED Warm White': {
    unit: 'pcs',
    warehouses: { 'Gudang Bali 66': 105, 'Gudang Bali 70': 90, 'Gudang C9': 45 },
  },
  'Table Runner Gold': {
    unit: 'pcs',
    warehouses: { 'Gudang Bali 66': 22, 'Gudang Bali 70': 47, 'Gudang C9': 15 },
  },
  'Photobooth Frame': {
    unit: 'set',
    warehouses: { 'Gudang Bali 66': 5, 'Gudang Bali 70': 8, 'Gudang C9': 1 },
  },
  'Tealight Holder 15cm': {
    unit: 'pcs',
    warehouses: { 'Gudang Bali 66': 75, 'Gudang Bali 70': 80, 'Gudang C9': 35 },
  },
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function estimateMaterials(imageCount, extraNotes) {
  const noteBias = Math.min(3, Math.floor((extraNotes || '').length / 80));
  const base = Math.max(1, imageCount);

  return [
    { name: 'Backdrop Floral 3x2m', qty: base + noteBias, unit: 'pcs' },
    { name: 'Kain Putih 3m', qty: base * 4 + noteBias * 2, unit: 'roll' },
    { name: 'Standing Flower Tall', qty: base * 2, unit: 'pcs' },
    { name: 'Kursi Tiffany', qty: 80 + base * 10, unit: 'pcs' },
    { name: 'Lampu LED Warm White', qty: base * 24 + noteBias * 6, unit: 'pcs' },
    { name: 'Table Runner Gold', qty: base * 8 + noteBias * 2, unit: 'pcs' },
    { name: 'Photobooth Frame', qty: Math.max(1, Math.floor(base / 2)), unit: 'set' },
    { name: 'Tealight Holder 15cm', qty: base * 20, unit: 'pcs' },
    { name: 'Crystal Chandelier Drop', qty: Math.max(1, Math.floor(base / 2)), unit: 'pcs' },
  ];
}

function itemStatus(required, stock) {
  if (stock >= required) return 'safe';
  if (stock >= Math.ceil(required * 0.7)) return 'warning';
  return 'critical';
}

function currency(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

function statusToBadge(status) {
  if (status === 'safe') return 'badge-green';
  if (status === 'warning') return 'badge-orange';
  if (status === 'critical') return 'badge-red';
  return 'badge-gray';
}

function sortableValue(item, key) {
  if (key === 'name' || key === 'unit' || key === 'status' || key === 'ref') {
    return String(item[key] || '').toLowerCase();
  }
  return Number(item[key] || 0);
}

function sortRows(rows, sortBy, sortDir) {
  const factor = sortDir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = sortableValue(a, sortBy);
    const vb = sortableValue(b, sortBy);
    if (va < vb) return -1 * factor;
    if (va > vb) return 1 * factor;
    return 0;
  });
}

export default function AIAnalyzerPage() {
  const editorRef = useRef(null);
  const [projectId, setProjectId] = useState('');
  const [notesHtml, setNotesHtml] = useState('');
  const [images, setImages] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialSortBy, setMaterialSortBy] = useState('name');
  const [materialSortDir, setMaterialSortDir] = useState('asc');
  const [relatedSearch, setRelatedSearch] = useState('');
  const [relatedSortBy, setRelatedSortBy] = useState('name');
  const [relatedSortDir, setRelatedSortDir] = useState('asc');
  const [highlightRef, setHighlightRef] = useState('');
  const [selectedRelatedItem, setSelectedRelatedItem] = useState(null);

  const selectedProject = useMemo(
    () => PROJECT_OPTIONS.find(p => p.id === projectId) || null,
    [projectId],
  );

  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.url));
    };
  }, [images]);

  function applyFormat(command) {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false);
  }

  function onPickImages(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const newItems = files.map(file => ({
      id: uid(),
      name: file.name,
      sizeKb: Math.max(1, Math.round(file.size / 1024)),
      url: URL.createObjectURL(file),
    }));

    setImages(prev => [...prev, ...newItems]);
    event.target.value = '';
  }

  function removeImage(id) {
    setImages(prev => {
      const target = prev.find(item => item.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter(item => item.id !== id);
    });
  }

  function analyzeNow() {
    if (!selectedProject || images.length === 0) return;

    setIsAnalyzing(true);
    setAnalysis(null);

    const plainNotes = (notesHtml || '').replace(/<[^>]*>/g, ' ').trim();
    const materials = estimateMaterials(images.length, plainNotes).map((item, index) => {
      const averagePrice = PRICE_BOOK[item.name] || 0;
      const ref = `EST-${String(index + 1).padStart(3, '0')}`;
      const hasRelatedInventory = Boolean(WAREHOUSE_STOCK[item.name]);
      return {
        ...item,
        ref,
        averagePrice,
        totalPrice: averagePrice * item.qty,
        relatedItemAvailability: hasRelatedInventory ? 1 : 0,
      };
    });

    const inventory = materials.map(item => {
      const stockEntry = WAREHOUSE_STOCK[item.name];
      const warehouseStocks = Object.fromEntries(
        WAREHOUSE_COLUMNS.map(warehouse => [warehouse, stockEntry?.warehouses?.[warehouse] ?? null]),
      );

      const totalStock = Object.values(warehouseStocks).reduce((sum, value) => sum + (value || 0), 0);
      const related = Boolean(stockEntry);

      return {
        ...item,
        warehouseStocks,
        stockUnit: stockEntry?.unit || item.unit,
        totalStock,
        related,
        status: related ? itemStatus(item.qty, totalStock) : 'unavailable',
      };
    });

    window.setTimeout(() => {
      setAnalysis({
        confidence: 84 + Math.min(12, images.length),
        analyzedAt: new Date().toLocaleString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: 'numeric', minute: '2-digit', hour12: true,
        }),
        materials,
        inventory,
      });
      setMaterialSearch('');
      setRelatedSearch('');
      setMaterialSortBy('name');
      setMaterialSortDir('asc');
      setRelatedSortBy('name');
      setRelatedSortDir('asc');
      setHighlightRef('');
      setSelectedRelatedItem(null);
      setIsAnalyzing(false);
    }, 1400);
  }

  function toggleMaterialSort(key) {
    if (materialSortBy === key) {
      setMaterialSortDir(dir => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setMaterialSortBy(key);
    setMaterialSortDir('asc');
  }

  function toggleRelatedSort(key) {
    if (relatedSortBy === key) {
      setRelatedSortDir(dir => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setRelatedSortBy(key);
    setRelatedSortDir('asc');
  }

  const shownMaterials = useMemo(() => {
    if (!analysis) return [];
    const q = materialSearch.toLowerCase().trim();
    const filteredRows = q
      ? analysis.materials.filter(item =>
          item.name.toLowerCase().includes(q) ||
          item.ref.toLowerCase().includes(q) ||
          item.unit.toLowerCase().includes(q),
        )
      : analysis.materials;
    return sortRows(filteredRows, materialSortBy, materialSortDir);
  }, [analysis, materialSearch, materialSortBy, materialSortDir]);

  const shownRelated = useMemo(() => {
    if (!analysis) return [];
    const q = relatedSearch.toLowerCase().trim();
    const filteredRows = q
      ? analysis.inventory.filter(item =>
          item.name.toLowerCase().includes(q) ||
          item.ref.toLowerCase().includes(q) ||
          item.status.toLowerCase().includes(q),
        )
      : analysis.inventory;
    return sortRows(filteredRows, relatedSortBy, relatedSortDir);
  }, [analysis, relatedSearch, relatedSortBy, relatedSortDir]);

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
        <h1 className="page-title" style={{ margin:0 }}>AI Analyzer</h1>
      </div>

      <div className="card ai-analyzer-card">
        <div className="ai-input-grid">
          <div className="form-group">
            <label>Project <span style={{ color:'var(--red)' }}>*</span></label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)}>
              <option value="">Choose project</option>
              {PROJECT_OPTIONS.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name} - {project.location} ({project.date})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Upload Images <span style={{ color:'var(--red)' }}>*</span></label>
            <label className="ai-upload-box" htmlFor="ai-images-input">
              <input id="ai-images-input" type="file" accept="image/*" multiple onChange={onPickImages} />
              <div className="ai-upload-inner">
                <IconPlus />
                <span>Add one or more images</span>
                <small>JPG, PNG, WEBP up to 10 files</small>
              </div>
            </label>
          </div>
        </div>

        {images.length > 0 && (
          <div className="ai-image-list">
            {images.map(image => (
              <div key={image.id} className="ai-image-item">
                <img src={image.url} alt={image.name} />
                <div className="ai-image-meta">
                  <span title={image.name}>{image.name}</span>
                  <small>{image.sizeKb} KB</small>
                </div>
                <button type="button" onClick={() => removeImage(image.id)}>Remove</button>
              </div>
            ))}
          </div>
        )}

        <div className="form-group" style={{ marginBottom: 18 }}>
          <label>Additional Notes (Rich Text)</label>
          <div className="ai-editor-wrap">
            <div className="ai-editor-toolbar">
              <button type="button" onClick={() => applyFormat('bold')}><strong>B</strong></button>
              <button type="button" onClick={() => applyFormat('italic')}><em>I</em></button>
              <button type="button" onClick={() => applyFormat('insertUnorderedList')}>List</button>
            </div>
            <div
              ref={editorRef}
              className="ai-editor"
              contentEditable
              onInput={e => setNotesHtml(e.currentTarget.innerHTML)}
              data-placeholder="Add notes for style direction, color palette, area priority, or constraints..."
            />
          </div>
        </div>

        <div className="ai-action-row">
          <button
            className="btn-new"
            onClick={analyzeNow}
            disabled={isAnalyzing || !selectedProject || images.length === 0}
            style={{ opacity: isAnalyzing || !selectedProject || images.length === 0 ? 0.65 : 1 }}
          >
            <IconSearch /> {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {isAnalyzing && (
          <div className="ai-loading">
            <div className="ai-loader-dot" />
            <p>Analyzing image references and generating material requirements...</p>
          </div>
        )}

        {analysis && (
          <div className="ai-result-block">
            <div className="ai-result-head">
              <div>
                <h3>Analysis Result</h3>
                <p>{selectedProject?.name} · {analysis.analyzedAt}</p>
              </div>
              <span className="badge badge-green">Confidence {analysis.confidence}%</span>
            </div>

            <div className="ai-result-grid">
              <div>
                <h4>Estimated Material Needs</h4>
                <div className="ai-table-tools">
                  <div className="search-wrap ai-table-search-wrap">
                    <IconSearch />
                    <input
                      className="search-input"
                      type="text"
                      placeholder="Search estimated materials..."
                      value={materialSearch}
                      onChange={e => setMaterialSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="ai-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th className="ai-sort-head" onClick={() => toggleMaterialSort('name')}>Material</th>
                        <th style={{ width:92, textAlign:'right' }} className="ai-sort-head" onClick={() => toggleMaterialSort('qty')}>Qty</th>
                        <th style={{ width:82 }} className="ai-sort-head" onClick={() => toggleMaterialSort('unit')}>Unit</th>
                        <th style={{ width:142, textAlign:'right' }} className="ai-sort-head" onClick={() => toggleMaterialSort('averagePrice')}>Avg Price</th>
                        <th style={{ width:152, textAlign:'right' }} className="ai-sort-head" onClick={() => toggleMaterialSort('totalPrice')}>Total Price</th>
                        <th style={{ width:95 }} className="ai-sort-head" onClick={() => toggleMaterialSort('ref')}>Ref</th>
                        <th style={{ width:170, textAlign:'right' }} className="ai-sort-head" onClick={() => toggleMaterialSort('relatedItemAvailability')}>Related Item Availability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shownMaterials.map(item => (
                        <tr key={item.name}>
                          <td className="name-cell">{item.name}</td>
                          <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{item.qty}</td>
                          <td>{item.unit}</td>
                          <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{currency(item.averagePrice)}</td>
                          <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight: 700 }}>{currency(item.totalPrice)}</td>
                          <td>{item.ref}</td>
                          <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums' }}>
                            <button
                              type="button"
                              className="ai-link-button"
                              onClick={() => setHighlightRef(item.ref)}
                              title="Highlight related row"
                            >
                              {item.relatedItemAvailability}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4>Related Inventory Availability</h4>
                <div className="ai-table-tools">
                  <div className="search-wrap ai-table-search-wrap">
                    <IconSearch />
                    <input
                      className="search-input"
                      type="text"
                      placeholder="Search related inventory..."
                      value={relatedSearch}
                      onChange={e => setRelatedSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="ai-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th className="ai-sort-head" onClick={() => toggleRelatedSort('name')}>Material</th>
                        <th style={{ width:82, textAlign:'right' }} className="ai-sort-head" onClick={() => toggleRelatedSort('qty')}>Need</th>
                        <th style={{ width:92 }} className="ai-sort-head" onClick={() => toggleRelatedSort('ref')}>Ref</th>
                        {WAREHOUSE_COLUMNS.map(warehouse => (
                          <th key={warehouse} style={{ width:130, textAlign:'right' }}>{warehouse}</th>
                        ))}
                        <th style={{ width:122, textAlign:'right' }} className="ai-sort-head" onClick={() => toggleRelatedSort('totalStock')}>Total Stock</th>
                        <th style={{ width:108 }} className="ai-sort-head" onClick={() => toggleRelatedSort('status')}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shownRelated.map(item => (
                        <tr
                          key={item.name}
                          className={highlightRef && highlightRef === item.ref ? 'ai-row-highlight' : ''}
                          onClick={() => {
                            setSelectedRelatedItem(item);
                            setHighlightRef(item.ref);
                          }}
                          style={{ cursor:'pointer' }}
                        >
                          <td className="name-cell">{item.name}</td>
                          <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{item.qty}</td>
                          <td>{item.ref}</td>
                          {WAREHOUSE_COLUMNS.map(warehouse => (
                            <td key={warehouse} style={{ textAlign:'right', fontVariantNumeric:'tabular-nums' }}>
                              {item.warehouseStocks[warehouse] === null
                                ? '-'
                                : `${item.warehouseStocks[warehouse]} ${item.stockUnit}`}
                            </td>
                          ))}
                          <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight: 600 }}>
                            {item.related ? `${item.totalStock} ${item.stockUnit}` : '-'}
                          </td>
                          <td>
                            <span className={`badge ${statusToBadge(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {selectedRelatedItem && (
              <>
                <div className="ai-drawer-backdrop" onClick={() => setSelectedRelatedItem(null)} />
                <aside className="ai-detail-drawer">
                  <div className="ai-detail-head">
                    <strong>Product Detail</strong>
                    <button type="button" className="modal-close" onClick={() => setSelectedRelatedItem(null)}>
                      <IconClose />
                    </button>
                  </div>
                  <div className="ai-detail-body">
                    <div className="ai-detail-row"><span>Material</span><strong>{selectedRelatedItem.name}</strong></div>
                    <div className="ai-detail-row"><span>Ref</span><strong>{selectedRelatedItem.ref}</strong></div>
                    <div className="ai-detail-row"><span>Need</span><strong>{selectedRelatedItem.qty} {selectedRelatedItem.unit}</strong></div>
                    <div className="ai-detail-row"><span>Total Stock</span><strong>{selectedRelatedItem.related ? `${selectedRelatedItem.totalStock} ${selectedRelatedItem.stockUnit}` : 'Not Available'}</strong></div>
                    <div className="ai-detail-row"><span>Status</span><span className={`badge ${statusToBadge(selectedRelatedItem.status)}`}>{selectedRelatedItem.status}</span></div>
                    <div className="ai-detail-warehouse-list">
                      {WAREHOUSE_COLUMNS.map(warehouse => (
                        <div key={warehouse} className="ai-detail-warehouse-item">
                          <span>{warehouse}</span>
                          <strong>
                            {selectedRelatedItem.warehouseStocks[warehouse] === null
                              ? '-'
                              : `${selectedRelatedItem.warehouseStocks[warehouse]} ${selectedRelatedItem.stockUnit}`}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
