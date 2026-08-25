'use strict';

/* ================= 工具 ================= */
function uid(prefix) { return (prefix || 'x') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function fmtDate(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}
function todayStr() { return fmtDate(new Date()); }
function parseDate(s) { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function addDays(s, n) { const d = parseDate(s); return fmtDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)); }
function nowTime() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
function weekdayCN(s) { return '周' + WEEK[parseDate(s).getDay()]; }
function dateText(s) {
  const t = todayStr();
  if (s === t) return '今天';
  if (s === addDays(t, -1)) return '昨天';
  if (s === addDays(t, 1)) return '明天';
  const p = s.split('-').map(Number);
  return p[1] + '月' + p[2] + '日';
}

/* ================= 图片存储 (IndexedDB) ================= */
const ImgDB = {
  _db: null,
  _open() {
    return new Promise(function (resolve, reject) {
      if (ImgDB._db) return resolve(ImgDB._db);
      if (!('indexedDB' in window)) return reject(new Error('no indexedDB'));
      const req = indexedDB.open('hygiene_imgs', 1);
      req.onupgradeneeded = function (e) {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('imgs')) db.createObjectStore('imgs');
      };
      req.onsuccess = function (e) { ImgDB._db = e.target.result; resolve(ImgDB._db); };
      req.onerror = function (e) { reject(e.target.error); };
    });
  },
  put(id, dataUrl) {
    return ImgDB._open().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction('imgs', 'readwrite');
        tx.objectStore('imgs').put(dataUrl, id);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function (e) { reject(e); };
      });
    });
  },
  get(id) {
    return ImgDB._open().then(function (db) {
      return new Promise(function (resolve, reject) {
        const req = db.transaction('imgs').objectStore('imgs').get(id);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function (e) { reject(e); };
      });
    });
  },
  del(id) {
    return ImgDB._open().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction('imgs', 'readwrite');
        tx.objectStore('imgs').delete(id);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function (e) { reject(e); };
      });
    });
  },
  clear() {
    return ImgDB._open().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction('imgs', 'readwrite');
        tx.objectStore('imgs').clear();
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function (e) { reject(e); };
      });
    });
  }
};

/* ================= 预置数据 ================= */
const DEFAULT_CLASSES = [
  { id: 'c01', name: '九2 杨明仙' }, { id: 'c02', name: '七6 熊贵云' }, { id: 'c03', name: '九7 左丽' },
  { id: 'c04', name: '八4 杨梅' }, { id: 'c05', name: '九3 胡旺' }, { id: 'c06', name: '八6 陈英权' },
  { id: 'c07', name: '九6 徐勇' }, { id: 'c08', name: '九1 周美' }, { id: 'c09', name: '八1 陈大超' },
  { id: 'c10', name: '八5 柳大远' }, { id: 'c11', name: '八3 王巧' }, { id: 'c12', name: '八2 李良贵' },
  { id: 'c13', name: '七1 罗富' }, { id: 'c14', name: '八7 刘义春' }, { id: 'c15', name: '九5 黄启龙' },
  { id: 'c16', name: '七4 雪莲' }, { id: 'c17', name: '九4 杨松' }, { id: 'c18', name: '七3 黄苇' },
  { id: 'c19', name: '七7 陈兴' }, { id: 'c20', name: '七5 刘玲' }, { id: 'c21', name: '七2 张莹' }
];
const DEFAULT_AREAS = [
  { id: 'a_c01', name: '九2班教室', type: 'classroom', defaultClassId: 'c01' },
  { id: 'a_c02', name: '七6班教室', type: 'classroom', defaultClassId: 'c02' },
  { id: 'a_c03', name: '九7班教室', type: 'classroom', defaultClassId: 'c03' },
  { id: 'a_c04', name: '八4班教室', type: 'classroom', defaultClassId: 'c04' },
  { id: 'a_c05', name: '九3班教室', type: 'classroom', defaultClassId: 'c05' },
  { id: 'a_c06', name: '八6班教室', type: 'classroom', defaultClassId: 'c06' },
  { id: 'a_c07', name: '九6班教室', type: 'classroom', defaultClassId: 'c07' },
  { id: 'a_c08', name: '九1班教室', type: 'classroom', defaultClassId: 'c08' },
  { id: 'a_c09', name: '八1班教室', type: 'classroom', defaultClassId: 'c09' },
  { id: 'a_c10', name: '八5班教室', type: 'classroom', defaultClassId: 'c10' },
  { id: 'a_c11', name: '八3班教室', type: 'classroom', defaultClassId: 'c11' },
  { id: 'a_c12', name: '八2班教室', type: 'classroom', defaultClassId: 'c12' },
  { id: 'a_c13', name: '七1班教室', type: 'classroom', defaultClassId: 'c13' },
  { id: 'a_c14', name: '八7班教室', type: 'classroom', defaultClassId: 'c14' },
  { id: 'a_c15', name: '九5班教室', type: 'classroom', defaultClassId: 'c15' },
  { id: 'a_c16', name: '七4班教室', type: 'classroom', defaultClassId: 'c16' },
  { id: 'a_c17', name: '九4班教室', type: 'classroom', defaultClassId: 'c17' },
  { id: 'a_c18', name: '七3班教室', type: 'classroom', defaultClassId: 'c18' },
  { id: 'a_c19', name: '七7班教室', type: 'classroom', defaultClassId: 'c19' },
  { id: 'a_c20', name: '七5班教室', type: 'classroom', defaultClassId: 'c20' },
  { id: 'a_c21', name: '七2班教室', type: 'classroom', defaultClassId: 'c21' },
  { id: 'a01', name: '教学楼左楼梯及楼梯脚', type: 'cleanup', defaultClassId: 'c01' },
  { id: 'a02', name: '教学楼右楼梯、校长室及教务处平台', type: 'cleanup', defaultClassId: 'c02' },
  { id: 'a03', name: '教学楼前左边平台及花坛', type: 'cleanup', defaultClassId: 'c03' },
  { id: 'a04', name: '教学楼前右边平台及花坛', type: 'cleanup', defaultClassId: 'c04' },
  { id: 'a05', name: '教学楼前大楼梯及花坛、黄土坡、洗手池', type: 'cleanup', defaultClassId: 'c05' },
  { id: 'a06', name: '综合楼（过道阳台、党建、阶梯教室）', type: 'cleanup', defaultClassId: 'c06' },
  { id: 'a07', name: '综合楼周围及大办公室路段', type: 'cleanup', defaultClassId: 'c07' },
  { id: 'a08', name: '教学楼前楼梯到操场及花坛', type: 'cleanup', defaultClassId: 'c08' },
  { id: 'a09', name: '操场大门侧（挡车球内）及花坛', type: 'cleanup', defaultClassId: 'c09' },
  { id: 'a10', name: '操场党建侧下水沟及平台', type: 'cleanup', defaultClassId: 'c10' },
  { id: 'a11', name: '操场舞台、平台及台阶', type: 'cleanup', defaultClassId: 'c11' },
  { id: 'a12', name: '操场舞台河边花坛', type: 'cleanup', defaultClassId: 'c12' },
  { id: 'a13', name: '舞台后男生宿舍前花坛', type: 'cleanup', defaultClassId: 'c13' },
  { id: 'a14', name: '男生宿舍后乒乓球场、洗手池及花坛', type: 'cleanup', defaultClassId: 'c14' },
  { id: 'a15', name: '食堂垃圾倾倒', type: 'cleanup', defaultClassId: 'c15' },
  { id: 'a16', name: '女厕所', type: 'cleanup', defaultClassId: 'c16' },
  { id: 'a17', name: '男厕所', type: 'cleanup', defaultClassId: 'c17' },
  { id: 'a18', name: '垃圾池及周围', type: 'cleanup', defaultClassId: 'c18' },
  { id: 'a19', name: '桥上到老教师周转房周边', type: 'cleanup', defaultClassId: 'c19' },
  { id: 'a20', name: '文化墙前到新教师周转房及黄土坡', type: 'cleanup', defaultClassId: 'c20' },
  { id: 'a21', name: '教学楼前到厕所、女生宿舍路段', type: 'cleanup', defaultClassId: 'c21' }
];
const DEFAULT_ISSUES = [
  { id: 'i_laji', name: '地面有垃圾/纸屑', deduction: 2 },
  { id: 'i_wuzi', name: '地面有污渍/积水', deduction: 1 },
  { id: 'i_zhuoyi', name: '桌椅摆放不整齐', deduction: 1 },
  { id: 'i_heiban', name: '黑板未擦净', deduction: 1 },
  { id: 'i_jiangtai', name: '讲台物品杂乱', deduction: 1 },
  { id: 'i_lajitong', name: '垃圾桶未清理', deduction: 2 },
  { id: 'i_menchuang', name: '门窗玻璃有灰尘', deduction: 1 },
  { id: 'i_gongju', name: '卫生工具摆放乱', deduction: 1 },
  { id: 'i_qiangbi', name: '墙壁有涂鸦/污迹', deduction: 2 },
  { id: 'i_zhizhu', name: '蜘蛛网未清理', deduction: 1 },
  { id: 'i_zoulang', name: '走廊/楼梯未打扫', deduction: 2 },
  { id: 'i_cesuo', name: '厕所异味/不洁', deduction: 2 },
  { id: 'i_qita', name: '其他问题', deduction: 1 }
];
/* ================= 数据层 ================= */
const KEYS = { classes: 'hygiene_classes', areas: 'hygiene_areas', issues: 'hygiene_issues', records: 'hygiene_records', settings: 'hygiene_settings' };

function read(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } }
function write(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

const Store = {
  getClasses() { return read(KEYS.classes, []); },
  saveClasses(v) { write(KEYS.classes, v); },
  getAreas() { return read(KEYS.areas, []); },
  saveAreas(v) { write(KEYS.areas, v); },
  getIssues() { return read(KEYS.issues, []); },
  saveIssues(v) { write(KEYS.issues, v); },
  getRecords() { return read(KEYS.records, {}); },
  saveRecords(v) { write(KEYS.records, v); },

  seed() {
    // v1->v2 迁移：旧版 classes 带 areas 字段、records 为嵌套对象（自动清理，避免新结构读取报错）
    const oldClasses = Store.getClasses();
    if (oldClasses.length > 0 && Array.isArray(oldClasses[0].areas)) {
      write(KEYS.classes, oldClasses.map(function (c) { return { id: c.id, name: c.name }; }));
    }
    const oldRecords = Store.getRecords();
    const firstDate = Object.keys(oldRecords)[0];
    if (firstDate && !Array.isArray(oldRecords[firstDate])) {
      localStorage.removeItem(KEYS.records);
    }
    // v3 迁移：旧地区无 type 字段 -> 用新预置替换
    const oldAreas = Store.getAreas();
    if (oldAreas.length > 0 && oldAreas[0].type === undefined) {
      localStorage.removeItem(KEYS.areas);
    }
    // v4 迁移：旧 indoor/outdoor 分类 -> 清洁区，并补充教室区域
    const curAreas = Store.getAreas();
    if (curAreas.length > 0 && (curAreas[0].type === 'indoor' || curAreas[0].type === 'outdoor')) {
      const cleaned = curAreas.map(function (a) { return { id: a.id, name: a.name, type: 'cleanup', defaultClassId: a.defaultClassId || '' }; });
      DEFAULT_AREAS.forEach(function (da) {
        if (da.type === 'classroom' && !cleaned.some(function (a) { return a.id === da.id; })) {
          cleaned.push({ id: da.id, name: da.name, type: 'classroom', defaultClassId: da.defaultClassId });
        }
      });
      write(KEYS.areas, cleaned);
    }
    if (localStorage.getItem(KEYS.classes) == null) write(KEYS.classes, DEFAULT_CLASSES.map(function (c) { return { id: c.id, name: c.name }; }));
    if (localStorage.getItem(KEYS.areas) == null) write(KEYS.areas, DEFAULT_AREAS.map(function (a) { return { id: a.id, name: a.name, type: a.type, defaultClassId: a.defaultClassId }; }));
    if (localStorage.getItem(KEYS.issues) == null) write(KEYS.issues, DEFAULT_ISSUES.map(function (i) { return { id: i.id, name: i.name, deduction: i.deduction }; }));
  },

  getArea(id) { return Store.getAreas().filter(function (a) { return a.id === id; })[0] || null; },
  getIssue(id) { return Store.getIssues().filter(function (i) { return i.id === id; })[0] || null; },
  getClass(id) { return Store.getClasses().filter(function (c) { return c.id === id; })[0] || null; },
  getClassName(id) { const c = Store.getClass(id); return c ? c.name : ''; },

  getDayRecords(date) {
    const r = Store.getRecords();
    return (r[date] || []).slice();
  },
  getDayAreaRecord(date, areaId) {
    return Store.getDayRecords(date).filter(function (r) { return r.areaId === areaId; })[0] || null;
  },
  addOrUpdateRecord(date, rec) {
    const r = Store.getRecords();
    if (!r[date]) r[date] = [];
    const list = r[date];
    const idx = list.map(function (x) { return x.areaId; }).indexOf(rec.areaId);
    if (idx >= 0) list[idx] = rec; else list.push(rec);
    Store.saveRecords(r);
  },
  delRecord(date, recId) {
    const r = Store.getRecords();
    if (!r[date]) return [];
    const list = r[date];
    const rec = list.filter(function (x) { return x.id === recId; })[0];
    if (!rec) return [];
    r[date] = list.filter(function (x) { return x.id !== recId; });
    if (r[date].length === 0) delete r[date];
    Store.saveRecords(r);
    return rec.imgIds || [];
  },
  clearDay(date) {
    const r = Store.getRecords();
    const day = r[date] || [];
    delete r[date];
    Store.saveRecords(r);
    const ids = [];
    day.forEach(function (rec) { (rec.imgIds || []).forEach(function (id) { ids.push(id); }); });
    return ids;
  },

  daySummary(date) {
    const areas = Store.getAreas();
    const recs = Store.getDayRecords(date);
    const areaMap = {};
    recs.forEach(function (rec) { areaMap[rec.areaId] = rec; });
    let checked = 0, deduct = 0, problems = 0, classroomDeduct = 0, cleanupDeduct = 0;
    areas.forEach(function (a) {
      const rec = areaMap[a.id];
      if (rec) {
        checked++;
        const d = rec.deduction || 0;
        deduct += d;
        problems += (rec.issueIds || []).length;
        if (a.type === 'classroom') classroomDeduct += d; else cleanupDeduct += d;
      }
    });
    return { checked: checked, deduct: deduct, problems: problems, classroomDeduct: classroomDeduct, cleanupDeduct: cleanupDeduct };
  },

  summarize(fromStr, toStr, typeFilter) {
    const r = Store.getRecords();
    const areaTypeMap = {};
    Store.getAreas().forEach(function (a) { areaTypeMap[a.id] = a.type || 'outdoor'; });
    const classDeduct = {};
    const issueCount = {};
    let daysSet = {};
    let classroomDeduct = 0, cleanupDeduct = 0;
    Object.keys(r).forEach(function (date) {
      if (date < fromStr || date > toStr) return;
      (r[date] || []).forEach(function (rec) {
        const type = areaTypeMap[rec.areaId] || 'cleanup';
        const d = rec.deduction || 0;
        if (type === 'classroom') classroomDeduct += d; else cleanupDeduct += d;
        if (typeFilter && typeFilter !== 'all' && type !== typeFilter) return;
        if (rec.classId) classDeduct[rec.classId] = (classDeduct[rec.classId] || 0) + d;
        (rec.issueIds || []).forEach(function (iid) { issueCount[iid] = (issueCount[iid] || 0) + 1; });
        daysSet[date] = 1;
      });
    });
    const days = Object.keys(daysSet).length;
    const totalDeduct = classroomDeduct + cleanupDeduct;
    const rank = Store.getClasses().map(function (c) {
      return { id: c.id, name: c.name, deduct: classDeduct[c.id] || 0 };
    }).sort(function (a, b) { return a.deduct - b.deduct; });
    const issueTop = Object.keys(issueCount).map(function (iid) {
      const it = Store.getIssue(iid);
      return { id: iid, name: it ? it.name : '已删除问题', count: issueCount[iid] };
    }).sort(function (a, b) { return b.count - a.count; });
    return { rank: rank, issueTop: issueTop, days: days, totalDeduct: totalDeduct, classroomDeduct: classroomDeduct, cleanupDeduct: cleanupDeduct, avg: days ? (totalDeduct / days).toFixed(1) : '0' };
  },

  exportAll() {
    return JSON.stringify({ classes: Store.getClasses(), areas: Store.getAreas(), issues: Store.getIssues(), records: Store.getRecords(), exportedAt: new Date().toISOString() });
  },
  importAll(json) {
    const data = JSON.parse(json);
    if (!data || typeof data !== 'object') throw new Error('数据格式错误');
    if (Array.isArray(data.classes)) Store.saveClasses(data.classes);
    if (Array.isArray(data.areas)) Store.saveAreas(data.areas);
    if (Array.isArray(data.issues)) Store.saveIssues(data.issues);
    if (data.records && typeof data.records === 'object') Store.saveRecords(data.records);
  }
};

/* ================= 全局状态 ================= */
const state = {
  view: 'check',
  checkDate: todayStr(),
  recDate: todayStr(),
  statsRange: 'week',
  statsType: 'all',
  draft: { areaId: '', classId: '', issueIds: [], deduction: 0, note: '', imgs: [], oldImgIds: [] },
  editingAreaId: null, editingClassId: null, editingIssueId: null,
  areaDefaultClass: '',
  areaType: 'indoor'
};

function $(id) { return document.getElementById(id); }

/* ================= Toast ================= */
let toastTimer = null;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.hidden = true; }, 1800);
}

/* ================= 视图切换 ================= */
function switchView(view) {
  state.view = view;
  document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
  document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
  $('view-' + view).classList.add('active');
  document.querySelector('.tab[data-view="' + view + '"]').classList.add('active');
  window.scrollTo(0, 0);
  if (view === 'check') renderCheck();
  else if (view === 'records') renderRecords();
  else if (view === 'stats') renderStats();
  else if (view === 'settings') renderSettings();
}

/* ================= 检查页 ================= */
function renderCheck() {
  $('check-date-text').textContent = dateText(state.checkDate);
  $('check-week-text').textContent = weekdayCN(state.checkDate);
  const areas = Store.getAreas();
  const sum = Store.daySummary(state.checkDate);
  $('sum-indoor').textContent = sum.classroomDeduct;
  $('sum-outdoor').textContent = sum.cleanupDeduct;
  $('sum-total').textContent = sum.deduct;
  const listEl = $('check-area-list');
  const emptyEl = $('check-empty');
  if (areas.length === 0) {
    listEl.innerHTML = '';
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;
  function areaCard(a) {
    const rec = Store.getDayAreaRecord(state.checkDate, a.id);
    let statusHtml;
    if (!rec) statusHtml = '<span class="area-state unchecked">未检查</span>';
    else if ((rec.issueIds || []).length === 0) statusHtml = '<span class="area-state clean">干净</span>';
    else statusHtml = '<span class="area-state dirty">' + rec.issueIds.length + '问题 -' + (rec.deduction || 0) + '</span>';
    const cls = rec && rec.classId ? Store.getClassName(rec.classId) : (Store.getClassName(a.defaultClassId) || '');
    return '<div class="area-card" data-areaid="' + a.id + '">' +
      '<div class="area-card-main"><span class="area-card-name">' + esc(a.name) + '</span>' +
      '<span class="area-card-class">值日：' + (esc(cls) || '未设置') + '</span></div>' +
      statusHtml + '</div>';
  }
  const classroom = areas.filter(function (a) { return a.type === 'classroom'; });
  const cleanup = areas.filter(function (a) { return a.type === 'cleanup'; });
  let html = '';
  if (classroom.length) html += '<div class="group-title-bar"><span class="group-dot classroom"></span>🏫 教室卫生 <span class="group-count">' + classroom.length + ' 个区域</span></div>' + classroom.map(areaCard).join('');
  if (cleanup.length) html += '<div class="group-title-bar"><span class="group-dot cleanup"></span>🧹 清洁区 <span class="group-count">' + cleanup.length + ' 个区域</span></div>' + cleanup.map(areaCard).join('');
  listEl.innerHTML = html;
}
function openRecordSheet(areaId) {
  const area = Store.getArea(areaId);
  if (!area) return;
  state.draft = { areaId: areaId, classId: area.defaultClassId || '', issueIds: [], deduction: 0, note: '', imgs: [], oldImgIds: [] };
  const existing = Store.getDayAreaRecord(state.checkDate, areaId);
  if (existing) {
    state.draft.classId = existing.classId || '';
    state.draft.issueIds = (existing.issueIds || []).slice();
    state.draft.deduction = existing.deduction || 0;
    state.draft.note = existing.note || '';
    state.draft.oldImgIds = (existing.imgIds || []).slice();
  }
  $('record-sheet-title').textContent = area.name;
  renderRecordIssues();
  renderRecordClasses();
  updateRecordDeduct();
  $('record-note').value = state.draft.note;
  $('record-imgs').innerHTML = '';
  renderRecordImgs(state.draft.oldImgIds, true);
  $('record-mask').hidden = false;
  $('record-sheet').hidden = false;
}

function renderRecordIssues() {
  const issues = Store.getIssues();
  const el = $('record-issues');
  if (issues.length === 0) { el.innerHTML = '<span class="chip-empty">请在设置里添加卫生问题</span>'; return; }
  let html = '';
  issues.forEach(function (i) {
    const sel = state.draft.issueIds.indexOf(i.id) >= 0;
    html += '<button class="issue-chip' + (sel ? ' sel' : '') + '" data-issueid="' + i.id + '">' + esc(i.name) + '<span class="chip-deduct">-' + i.deduction + '</span></button>';
  });
  el.innerHTML = html;
}

function renderRecordClasses() {
  const classes = Store.getClasses();
  const el = $('record-classes');
  if (classes.length === 0) { el.innerHTML = '<span class="chip-empty">请先在设置里添加值日班级</span>'; return; }
  let html = '';
  classes.forEach(function (c) {
    const sel = state.draft.classId === c.id;
    html += '<button class="class-chip' + (sel ? ' sel' : '') + '" data-classid="' + c.id + '">' + esc(c.name) + '</button>';
  });
  el.innerHTML = html;
}

function updateRecordDeduct() { $('record-deduct-val').textContent = state.draft.deduction; }

function toggleIssue(issueId) {
  const idx = state.draft.issueIds.indexOf(issueId);
  if (idx >= 0) state.draft.issueIds.splice(idx, 1); else state.draft.issueIds.push(issueId);
  const issues = Store.getIssues();
  state.draft.deduction = state.draft.issueIds.reduce(function (s, id) {
    const it = issues.filter(function (i) { return i.id === id; })[0];
    return s + (it ? it.deduction : 0);
  }, 0);
  renderRecordIssues();
  updateRecordDeduct();
}

function setRecordClass(classId) { state.draft.classId = classId; renderRecordClasses(); }

function setRecordClean() {
  state.draft.issueIds = [];
  state.draft.deduction = 0;
  renderRecordIssues();
  updateRecordDeduct();
}

function renderRecordImgs(imgIds, isExisting) {
  const el = $('record-imgs');
  let html = '';
  if (isExisting) {
    state.draft.oldImgIds = imgIds.slice();
    state.draft.imgs = [];
    imgIds.forEach(function (id) {
      html += '<div class="img-thumb"><img src="" data-load="' + id + '"><button class="img-del" data-imgid="' + id + '">✕</button></div>';
    });
    el.innerHTML = html;
    imgIds.forEach(function (id) {
      ImgDB.get(id).then(function (dataUrl) {
        if (!dataUrl) return;
        state.draft.imgs.push({ id: id, dataUrl: dataUrl });
        el.querySelectorAll('img[data-load="' + id + '"]').forEach(function (im) { im.src = dataUrl; });
      });
    });
  } else {
    state.draft.imgs.forEach(function (img) {
      html += '<div class="img-thumb"><img src="' + img.dataUrl + '"><button class="img-del" data-imgid="' + img.id + '">✕</button></div>';
    });
    el.innerHTML = html;
  }
}

function onPickImage() { $('record-img-input').click(); }

function compressImage(file) {
  return new Promise(function (resolve, reject) {
    const maxDim = 1280, quality = 0.72;
    let bitmapPromise;
    try { bitmapPromise = createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) { bitmapPromise = null; }
    const fallbackLoad = function () {
      return new Promise(function (res, rej) {
        const img = new Image();
        img.onload = function () { res(img); };
        img.onerror = rej;
        img.src = URL.createObjectURL(file);
      });
    };
    Promise.resolve(bitmapPromise || fallbackLoad()).then(function (bm) {
      let w = bm.width, h = bm.height;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      w = Math.round(w * scale); h = Math.round(h * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(bm, 0, 0, w, h);
      if (bm.close) bm.close();
      resolve(canvas.toDataURL('image/jpeg', quality));
    }).catch(reject);
  });
}

function onImgInputChange(e) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  if (state.draft.imgs.length + state.draft.oldImgIds.length >= 3) { toast('最多上传 3 张照片'); return; }
  compressImage(file).then(function (dataUrl) {
    state.draft.imgs.push({ id: uid('img'), dataUrl: dataUrl });
    renderRecordImgs();
  }).catch(function () { toast('图片处理失败'); });
}

function onImgDel(imgId) {
  state.draft.imgs = state.draft.imgs.filter(function (x) { return x.id !== imgId; });
  state.draft.oldImgIds = state.draft.oldImgIds.filter(function (x) { return x !== imgId; });
  renderRecordImgs();
}

function saveRecord() {
  const d = state.draft;
  if (!d.areaId) return;
  if (!d.classId) { toast('请选择值日班级'); return; }
  const rec = {
    id: uid('rec'),
    areaId: d.areaId,
    classId: d.classId,
    issueIds: d.issueIds.slice(),
    deduction: d.deduction,
    note: $('record-note').value.trim(),
    imgIds: d.imgs.map(function (x) { return x.id; }),
    time: nowTime()
  };
  const finalIds = rec.imgIds;
  d.oldImgIds.forEach(function (id) { if (finalIds.indexOf(id) < 0) ImgDB.del(id); });
  const putPromises = d.imgs.map(function (img) { return ImgDB.put(img.id, img.dataUrl); });
  Promise.all(putPromises).then(function () {
    Store.addOrUpdateRecord(state.checkDate, rec);
    closeRecordSheet();
    renderCheck();
    toast('已保存');
  }).catch(function () {
    Store.addOrUpdateRecord(state.checkDate, rec);
    closeRecordSheet();
    renderCheck();
    toast('已保存');
  });
}

function closeRecordSheet() {
  $('record-mask').hidden = true;
  $('record-sheet').hidden = true;
}

function cleanAllToday() {
  if (!confirm('将「' + dateText(state.checkDate) + '」当天所有地区标记为干净并清除记录？')) return;
  const ids = Store.clearDay(state.checkDate);
  ids.forEach(function (id) { ImgDB.del(id); });
  renderCheck();
  toast('已全部标记干净');
}

function copySummary() {
  const areas = Store.getAreas();
  if (areas.length === 0) { toast('还没有地区'); return; }
  const recs = Store.getDayRecords(state.checkDate);
  const sum = Store.daySummary(state.checkDate);
  let lines = [dateText(state.checkDate) + ' ' + weekdayCN(state.checkDate) + ' 卫生检查'];
  areas.forEach(function (a) {
    const rec = recs.filter(function (r) { return r.areaId === a.id; })[0];
    if (!rec) return;
    const cls = Store.getClassName(rec.classId) || '未记录班级';
    let desc;
    if ((rec.issueIds || []).length === 0) desc = '干净';
    else {
      const names = rec.issueIds.map(function (id) { const it = Store.getIssue(id); return it ? it.name : ''; }).filter(Boolean);
      desc = names.join('、') + ' (-' + (rec.deduction || 0) + ')';
    }
    lines.push(a.name + '（' + cls + '）：' + desc);
  });
  lines.push('共检查 ' + sum.checked + ' 个地区，扣 ' + sum.deduct + ' 分');
  copyText(lines.join('\n'));
}

function copyText(text) {
  function done() { toast('已复制到剪贴板'); }
  function fallback() {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { toast('复制失败'); }
    document.body.removeChild(ta);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(fallback);
  else fallback();
}
/* ================= 记录页 ================= */
function renderRecords() {
  $('rec-date-text').textContent = dateText(state.recDate);
  $('rec-week-text').textContent = weekdayCN(state.recDate);
  const recs = Store.getDayRecords(state.recDate);
  const listEl = $('rec-list');
  const emptyEl = $('rec-empty');
  emptyEl.hidden = recs.length > 0;
  if (recs.length === 0) { listEl.innerHTML = ''; return; }
  let html = '';
  recs.forEach(function (rec) {
    const area = Store.getArea(rec.areaId);
    const cls = Store.getClassName(rec.classId) || '未记录';
    let issuesHtml = '';
    if ((rec.issueIds || []).length === 0) issuesHtml = '<span class="rec-tag clean">干净</span>';
    else {
      rec.issueIds.forEach(function (id) {
        const it = Store.getIssue(id);
        issuesHtml += '<span class="rec-tag">' + esc(it ? it.name : '已删除问题') + '</span>';
      });
    }
    const imgsHtml = (rec.imgIds || []).map(function (id) {
      return '<div class="rec-img"><img src="" data-load="' + id + '"></div>';
    }).join('');
    html += '<div class="rec-card">' +
      '<div class="rec-card-head"><span class="rec-area-name">' + esc(area ? area.name : '已删除地区') + '</span>' +
      '<span class="rec-class">' + esc(cls) + '</span>' +
      '<span class="rec-deduct">-' + (rec.deduction || 0) + '</span>' +
      '<button class="rec-del" data-recid="' + rec.id + '">✕</button></div>' +
      '<div class="rec-tags">' + issuesHtml + '</div>' +
      (rec.note ? '<div class="rec-note">' + esc(rec.note) + '</div>' : '') +
      '<div class="rec-imgs">' + imgsHtml + '</div>' +
      '<div class="rec-time">' + esc(rec.time || '') + '</div>' +
      '</div>';
  });
  listEl.innerHTML = html;
  recs.forEach(function (rec) {
    (rec.imgIds || []).forEach(function (id) {
      ImgDB.get(id).then(function (dataUrl) {
        if (!dataUrl) return;
        listEl.querySelectorAll('img[data-load="' + id + '"]').forEach(function (im) { im.src = dataUrl; });
      });
    });
  });
}

function delRecordAndImgs(recId) {
  const ids = Store.delRecord(state.recDate, recId);
  ids.forEach(function (id) { ImgDB.del(id); });
  renderRecords();
  toast('已删除');
}

function clearDayAndImgs() {
  if (!confirm('删除「' + dateText(state.recDate) + '」当天全部记录（含照片）？')) return;
  const ids = Store.clearDay(state.recDate);
  ids.forEach(function (id) { ImgDB.del(id); });
  renderRecords();
  toast('已删除当天记录');
}

/* ================= 统计页 ================= */
function statsRangeDates() {
  const t = todayStr();
  const today = parseDate(t);
  if (state.statsRange === 'all') return { from: '0000-00-00', to: t };
  if (state.statsRange === 'week') {
    const dow = today.getDay() === 0 ? 6 : today.getDay() - 1;
    return { from: addDays(t, -dow), to: t };
  }
  const from = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-01';
  return { from: from, to: t };
}

function renderStats() {
  document.querySelectorAll('#stats-range .seg').forEach(function (b) { b.classList.toggle('active', b.dataset.range === state.statsRange); });
  document.querySelectorAll('#stats-type .seg').forEach(function (b) { b.classList.toggle('active', b.dataset.type === state.statsType); });
  const range = statsRangeDates();
  const s = Store.summarize(range.from, range.to, state.statsType);
  $('stat-indoor').textContent = s.classroomDeduct;
  $('stat-outdoor').textContent = s.cleanupDeduct;
  $('stat-total-deduct').textContent = s.totalDeduct;

  const rankEl = $('stats-rank-list');
  const rankEmpty = $('stats-rank-empty');
  const hasClass = s.rank.length > 0;
  const hasDeduct = s.rank.some(function (c) { return c.deduct > 0; });
  if (!hasClass) { rankEl.innerHTML = ''; rankEmpty.hidden = false; document.querySelector('#stats-rank-empty p').textContent = '还没有班级'; }
  else if (!hasDeduct) { rankEl.innerHTML = ''; rankEmpty.hidden = false; document.querySelector('#stats-rank-empty p').textContent = '该时段内暂无扣分'; }
  else {
    rankEmpty.hidden = true;
    const maxDeduct = Math.max.apply(null, s.rank.map(function (c) { return c.deduct; })) || 1;
    let html = '';
    s.rank.forEach(function (c, i) {
      const pct = Math.round(c.deduct / maxDeduct * 100);
      const medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : '<span class="rank-num">' + (i + 1) + '</span>'));
      html += '<div class="rank-row"><span class="rank-medal">' + medal + '</span>' +
        '<span class="rank-name">' + esc(c.name) + '</span>' +
        '<span class="rank-bar-wrap"><span class="rank-bar" style="width:' + pct + '%"></span></span>' +
        '<span class="rank-deduct">' + (c.deduct > 0 ? '-' + c.deduct : '0') + '</span></div>';
    });
    rankEl.innerHTML = html;
  }

  const issueEl = $('stats-issue-list');
  const issueEmpty = $('stats-issue-empty');
  if (s.issueTop.length === 0) { issueEl.innerHTML = ''; issueEmpty.hidden = false; }
  else {
    issueEmpty.hidden = true;
    const maxCount = s.issueTop[0].count;
    let html = '';
    s.issueTop.forEach(function (it, i) {
      const pct = Math.round(it.count / maxCount * 100);
      html += '<div class="issue-row"><span class="issue-rank">' + (i + 1) + '</span>' +
        '<span class="issue-name">' + esc(it.name) + '</span>' +
        '<span class="issue-bar-wrap"><span class="issue-bar" style="width:' + pct + '%"></span></span>' +
        '<span class="issue-count">' + it.count + '次</span></div>';
    });
    issueEl.innerHTML = html;
  }
}
/* ================= 设置页 ================= */
function renderSettings() { renderAreaManage(); renderClassManage(); renderIssueManage(); }

function renderAreaManage() {
  const areas = Store.getAreas();
  const el = $('area-manage-list');
  let html = '';
  areas.forEach(function (a) {
    const cls = Store.getClassName(a.defaultClassId);
    const typeLabel = a.type === 'classroom' ? '<span class="type-tag classroom">🏫教室</span>' : '<span class="type-tag cleanup">🧹清洁区</span>';
    html += '<div class="manage-row" data-id="' + a.id + '">' +
      '<div class="manage-main"><span class="manage-name">' + esc(a.name) + '</span>' +
      '<span class="manage-sub">' + typeLabel + ' ' + (cls ? '值日：' + esc(cls) : '未设值日班级') + '</span></div>' +
      '<span class="manage-edit">编辑 ›</span></div>';
  });
  el.innerHTML = html || '<div class="manage-empty">暂无地区</div>';
}

function renderClassManage() {
  const classes = Store.getClasses();
  const el = $('class-manage-list');
  let html = '';
  classes.forEach(function (c) {
    html += '<div class="manage-row" data-id="' + c.id + '">' +
      '<div class="manage-main"><span class="manage-name">' + esc(c.name) + '</span></div>' +
      '<span class="manage-edit">编辑 ›</span></div>';
  });
  el.innerHTML = html || '<div class="manage-empty">暂无班级</div>';
}

function renderIssueManage() {
  const issues = Store.getIssues();
  const el = $('issue-manage-list');
  let html = '';
  issues.forEach(function (i) {
    html += '<div class="manage-row" data-id="' + i.id + '">' +
      '<div class="manage-main"><span class="manage-name">' + esc(i.name) + '</span>' +
      '<span class="manage-sub">扣 ' + i.deduction + ' 分</span></div>' +
      '<span class="manage-edit">编辑 ›</span></div>';
  });
  el.innerHTML = html || '<div class="manage-empty">暂无问题</div>';
}

/* ---- 地区编辑 ---- */
function openAreaSheet(editingId) {
  state.editingAreaId = editingId;
  state.areaDefaultClass = '';
  state.areaType = 'classroom';
  const isEdit = !!editingId;
  $('area-sheet-title').textContent = isEdit ? '编辑地区' : '添加地区';
  $('area-delete').hidden = !isEdit;
  $('area-name').value = '';
  if (isEdit) {
    const a = Store.getArea(editingId);
    if (a) { $('area-name').value = a.name; state.areaDefaultClass = a.defaultClassId || ''; state.areaType = a.type || 'classroom'; }
  }
  renderAreaType();
  renderAreaDefaultClass();
  $('area-mask').hidden = false;
  $('area-sheet').hidden = false;
}

function renderAreaType() {
  document.querySelectorAll('#area-type .seg').forEach(function (b) { b.classList.toggle('active', b.dataset.type === state.areaType); });
}

function renderAreaDefaultClass() {
  const classes = Store.getClasses();
  const el = $('area-default-class');
  if (classes.length === 0) { el.innerHTML = '<span class="chip-empty">暂无班级，可先保存地区</span>'; return; }
  let html = '<button class="class-chip' + (state.areaDefaultClass === '' ? ' sel' : '') + '" data-classid="">不设默认</button>';
  classes.forEach(function (c) {
    html += '<button class="class-chip' + (state.areaDefaultClass === c.id ? ' sel' : '') + '" data-classid="' + c.id + '">' + esc(c.name) + '</button>';
  });
  el.innerHTML = html;
}

function onAreaSave() {
  const name = $('area-name').value.trim();
  if (!name) { toast('请输入地区名称'); return; }
  const areas = Store.getAreas();
  if (state.editingAreaId) areas.forEach(function (a) { if (a.id === state.editingAreaId) { a.name = name; a.defaultClassId = state.areaDefaultClass; a.type = state.areaType; } });
  else areas.push({ id: uid('a'), name: name, defaultClassId: state.areaDefaultClass, type: state.areaType });
  Store.saveAreas(areas);
  closeAreaSheet();
  renderSettings();
  toast('已保存');
}

function onAreaDelete() {
  if (!state.editingAreaId) return;
  if (!confirm('删除该地区？其历史记录仍保留。')) return;
  Store.saveAreas(Store.getAreas().filter(function (a) { return a.id !== state.editingAreaId; }));
  closeAreaSheet();
  renderSettings();
  toast('已删除');
}

function closeAreaSheet() {
  $('area-mask').hidden = true;
  $('area-sheet').hidden = true;
  state.editingAreaId = null;
}

/* ---- 班级编辑 ---- */
function openClassSheet(editingId) {
  state.editingClassId = editingId;
  const isEdit = !!editingId;
  $('class-sheet-title').textContent = isEdit ? '编辑班级' : '添加班级';
  $('class-delete').hidden = !isEdit;
  $('class-name').value = '';
  if (isEdit) { const c = Store.getClass(editingId); if (c) $('class-name').value = c.name; }
  $('class-mask').hidden = false;
  $('class-sheet').hidden = false;
}

function onClassSave() {
  const name = $('class-name').value.trim();
  if (!name) { toast('请输入班级名称'); return; }
  const classes = Store.getClasses();
  if (state.editingClassId) classes.forEach(function (c) { if (c.id === state.editingClassId) c.name = name; });
  else classes.push({ id: uid('c'), name: name });
  Store.saveClasses(classes);
  closeClassSheet();
  renderSettings();
  toast('已保存');
}

function onClassDelete() {
  if (!state.editingClassId) return;
  if (!confirm('删除该班级？历史记录仍保留（显示为未记录班级）。')) return;
  Store.saveClasses(Store.getClasses().filter(function (c) { return c.id !== state.editingClassId; }));
  const areas = Store.getAreas();
  areas.forEach(function (a) { if (a.defaultClassId === state.editingClassId) a.defaultClassId = ''; });
  Store.saveAreas(areas);
  closeClassSheet();
  renderSettings();
  toast('已删除');
}

function closeClassSheet() {
  $('class-mask').hidden = true;
  $('class-sheet').hidden = true;
  state.editingClassId = null;
}

/* ---- 问题编辑 ---- */
function openIssueSheet(editingId) {
  state.editingIssueId = editingId;
  const isEdit = !!editingId;
  $('issue-sheet-title').textContent = isEdit ? '编辑问题' : '添加问题';
  $('issue-delete').hidden = !isEdit;
  $('issue-name').value = '';
  setIssueDeduct(1);
  if (isEdit) {
    const i = Store.getIssue(editingId);
    if (i) { $('issue-name').value = i.name; setIssueDeduct(i.deduction); }
  }
  $('issue-mask').hidden = false;
  $('issue-sheet').hidden = false;
}

function setIssueDeduct(n) { $('issue-deduct-val').textContent = n; }

function onIssueSave() {
  const name = $('issue-name').value.trim();
  if (!name) { toast('请输入问题描述'); return; }
  const deduction = parseInt($('issue-deduct-val').textContent, 10) || 0;
  const issues = Store.getIssues();
  if (state.editingIssueId) issues.forEach(function (i) { if (i.id === state.editingIssueId) { i.name = name; i.deduction = deduction; } });
  else issues.push({ id: uid('i'), name: name, deduction: deduction });
  Store.saveIssues(issues);
  closeIssueSheet();
  renderSettings();
  toast('已保存');
}

function onIssueDelete() {
  if (!state.editingIssueId) return;
  if (!confirm('删除该问题？')) return;
  Store.saveIssues(Store.getIssues().filter(function (i) { return i.id !== state.editingIssueId; }));
  closeIssueSheet();
  renderSettings();
  toast('已删除');
}

function closeIssueSheet() {
  $('issue-mask').hidden = true;
  $('issue-sheet').hidden = true;
  state.editingIssueId = null;
}
/* ---- 数据 ---- */
function exportData() {
  const blob = new Blob([Store.exportAll()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '卫生检查数据_' + todayStr() + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('已导出');
}

function importData() { $('import-file').click(); }

function clearAllData() {
  if (!confirm('确定清空全部数据（地区、班级、问题、记录、照片）？此操作不可恢复，建议先导出备份。')) return;
  Object.keys(KEYS).forEach(function (k) { localStorage.removeItem(KEYS[k]); });
  ImgDB.clear().then(function () { }).catch(function () { });
  Store.seed();
  renderSettings(); renderCheck(); renderRecords(); renderStats();
  toast('已清空');
}

/* ---- 图片大图预览 ---- */
function showImgView(dataUrl) {
  $('imgview-img').src = dataUrl;
  $('imgview-mask').hidden = false;
  $('imgview').hidden = false;
}
function closeImgView() {
  $('imgview-mask').hidden = true;
  $('imgview').hidden = true;
}
/* ================= 事件绑定 ================= */
function bindEvents() {
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () { switchView(t.dataset.view); });
  });

  $('check-prev').addEventListener('click', function () { state.checkDate = addDays(state.checkDate, -1); renderCheck(); });
  $('check-next').addEventListener('click', function () { state.checkDate = addDays(state.checkDate, 1); renderCheck(); });
  $('btn-clean-all').addEventListener('click', cleanAllToday);
  $('btn-copy').addEventListener('click', copySummary);
  $('empty-go-settings').addEventListener('click', function () { switchView('settings'); });
  $('check-area-list').addEventListener('click', function (e) {
    const card = e.target.closest('.area-card');
    if (card) openRecordSheet(card.dataset.areaid);
  });

  $('record-mask').addEventListener('click', closeRecordSheet);
  $('record-cancel').addEventListener('click', closeRecordSheet);
  $('record-save').addEventListener('click', saveRecord);
  $('record-clean').addEventListener('click', setRecordClean);
  $('record-issues').addEventListener('click', function (e) {
    const chip = e.target.closest('.issue-chip');
    if (chip) toggleIssue(chip.dataset.issueid);
  });
  $('record-classes').addEventListener('click', function (e) {
    const chip = e.target.closest('.class-chip');
    if (chip) setRecordClass(chip.dataset.classid);
  });
  $('record-deduct-minus').addEventListener('click', function () { state.draft.deduction = Math.max(0, state.draft.deduction - 1); updateRecordDeduct(); });
  $('record-deduct-plus').addEventListener('click', function () { state.draft.deduction += 1; updateRecordDeduct(); });
  $('record-add-img').addEventListener('click', onPickImage);
  $('record-img-input').addEventListener('change', onImgInputChange);
  $('record-imgs').addEventListener('click', function (e) {
    const del = e.target.closest('.img-del');
    if (del) { onImgDel(del.dataset.imgid); return; }
    const img = e.target.closest('img');
    if (img && img.src) showImgView(img.src);
  });

  $('rec-prev').addEventListener('click', function () { state.recDate = addDays(state.recDate, -1); renderRecords(); });
  $('rec-next').addEventListener('click', function () { state.recDate = addDays(state.recDate, 1); renderRecords(); });
  $('btn-clear-day').addEventListener('click', clearDayAndImgs);
  $('rec-list').addEventListener('click', function (e) {
    const del = e.target.closest('.rec-del');
    if (del) { if (confirm('删除该条记录（含照片）？')) delRecordAndImgs(del.dataset.recid); return; }
    const img = e.target.closest('.rec-img img');
    if (img && img.src) showImgView(img.src);
  });

  document.querySelectorAll('#stats-range .seg').forEach(function (b) {
    b.addEventListener('click', function () { state.statsRange = b.dataset.range; renderStats(); });
  });
  document.querySelectorAll('#stats-type .seg').forEach(function (b) {
    b.addEventListener('click', function () { state.statsType = b.dataset.type; renderStats(); });
  });

  $('btn-add-area').addEventListener('click', function () { openAreaSheet(null); });
  $('area-manage-list').addEventListener('click', function (e) { const r = e.target.closest('.manage-row'); if (r) openAreaSheet(r.dataset.id); });
  $('btn-add-class').addEventListener('click', function () { openClassSheet(null); });
  $('class-manage-list').addEventListener('click', function (e) { const r = e.target.closest('.manage-row'); if (r) openClassSheet(r.dataset.id); });
  $('btn-add-issue').addEventListener('click', function () { openIssueSheet(null); });
  $('issue-manage-list').addEventListener('click', function (e) { const r = e.target.closest('.manage-row'); if (r) openIssueSheet(r.dataset.id); });

  $('area-mask').addEventListener('click', closeAreaSheet);
  $('area-cancel').addEventListener('click', closeAreaSheet);
  $('area-save').addEventListener('click', onAreaSave);
  $('area-delete').addEventListener('click', onAreaDelete);
  $('area-type').addEventListener('click', function (e) {
    const seg = e.target.closest('.seg');
    if (seg) { state.areaType = seg.dataset.type; renderAreaType(); }
  });
  $('area-default-class').addEventListener('click', function (e) {
    const chip = e.target.closest('.class-chip');
    if (chip) { state.areaDefaultClass = chip.dataset.classid; renderAreaDefaultClass(); }
  });

  $('class-mask').addEventListener('click', closeClassSheet);
  $('class-cancel').addEventListener('click', closeClassSheet);
  $('class-save').addEventListener('click', onClassSave);
  $('class-delete').addEventListener('click', onClassDelete);

  $('issue-mask').addEventListener('click', closeIssueSheet);
  $('issue-cancel').addEventListener('click', closeIssueSheet);
  $('issue-save').addEventListener('click', onIssueSave);
  $('issue-delete').addEventListener('click', onIssueDelete);
  $('issue-deduct-minus').addEventListener('click', function () { setIssueDeduct(Math.max(0, (parseInt($('issue-deduct-val').textContent, 10) || 0) - 1)); });
  $('issue-deduct-plus').addEventListener('click', function () { setIssueDeduct((parseInt($('issue-deduct-val').textContent, 10) || 0) + 1); });

  $('btn-export').addEventListener('click', exportData);
  $('btn-copy').addEventListener('click', function () { copyText(Store.exportAll()); });
  $('btn-import').addEventListener('click', importData);
  $('btn-clear-all').addEventListener('click', clearAllData);
  $('import-file').addEventListener('change', function (e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try { Store.importAll(reader.result); renderSettings(); renderCheck(); renderRecords(); renderStats(); toast('导入成功'); }
      catch (err) { toast('导入失败：' + err.message); }
    };
    reader.readAsText(file);
  });

  $('imgview-mask').addEventListener('click', closeImgView);
  $('imgview-close').addEventListener('click', closeImgView);
}

/* ================= 初始化 ================= */
function init() {
  Store.seed();
  bindEvents();
  renderCheck();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(function () {});
  }
}

document.addEventListener('DOMContentLoaded', init);