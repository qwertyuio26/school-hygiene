'use strict';

/* ================= 工具函数 ================= */
function uid() { return 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

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

function addDays(s, n) { return fmtDate(new Date(parseDate(s).getFullYear(), parseDate(s).getMonth(), parseDate(s).getDate() + n)); }

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

/* ================= 数据层 ================= */
const KEY_CLASSES = 'hygiene_classes';
const KEY_RECORDS = 'hygiene_records';
const KEY_SETTINGS = 'hygiene_settings';

const DEFAULT_SETTINGS = { fairDeduction: 1, dirtyDeduction: 2, fullScore: 100 };

const Store = {
  getClasses() { try { return JSON.parse(localStorage.getItem(KEY_CLASSES) || '[]'); } catch (e) { return []; } },
  saveClasses(list) { localStorage.setItem(KEY_CLASSES, JSON.stringify(list)); },
  getRecords() { try { return JSON.parse(localStorage.getItem(KEY_RECORDS) || '{}'); } catch (e) { return {}; } },
  saveRecords(obj) { localStorage.setItem(KEY_RECORDS, JSON.stringify(obj)); },
  getSettings() { try { return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(localStorage.getItem(KEY_SETTINGS) || '{}')); } catch (e) { return Object.assign({}, DEFAULT_SETTINGS); } },
  saveSettings(s) { localStorage.setItem(KEY_SETTINGS, JSON.stringify(s)); },

  deductionFor(status) {
    const st = Store.getSettings();
    if (status === 'fair') return st.fairDeduction;
    if (status === 'dirty') return st.dirtyDeduction;
    return 0;
  },

  getAreaRec(date, classId, area) {
    const r = Store.getRecords();
    const day = r[date];
    if (!day || !day[classId] || !day[classId][area]) return null;
    return day[classId][area];
  },

  setAreaRec(date, classId, area, rec) {
    const r = Store.getRecords();
    if (!r[date]) r[date] = {};
    if (!r[date][classId]) r[date][classId] = {};
    r[date][classId][area] = rec;
    Store.saveRecords(r);
  },

  delAreaRec(date, classId, area) {
    const r = Store.getRecords();
    if (r[date] && r[date][classId] && r[date][classId][area]) {
      delete r[date][classId][area];
      if (Object.keys(r[date][classId]).length === 0) delete r[date][classId];
      if (Object.keys(r[date]).length === 0) delete r[date];
      Store.saveRecords(r);
    }
  },

  clearDay(date) {
    const r = Store.getRecords();
    if (r[date]) { delete r[date]; Store.saveRecords(r); }
  },

  // 某天的汇总：checked 已标记(非干净)区域数、deduct 总扣分
  daySummary(date) {
    const classes = Store.getClasses();
    const r = Store.getRecords();
    const day = r[date] || {};
    let checked = 0, deduct = 0, total = 0;
    const classDeduct = {};
    classes.forEach(function (c) {
      classDeduct[c.id] = 0;
      (c.areas || []).forEach(function (a) {
        total++;
        const rec = day[c.id] && day[c.id][a];
        if (rec && rec.status !== 'clean') {
          checked++;
          deduct += (rec.deduction || 0);
          classDeduct[c.id] += (rec.deduction || 0);
        }
      });
    });
    return { checked: checked, deduct: deduct, total: total, classDeduct: classDeduct };
  },

  // 统计：从 fromStr 到 toStr（含）
  summarize(fromStr, toStr) {
    const classes = Store.getClasses();
    const r = Store.getRecords();
    const per = {};
    classes.forEach(function (c) { per[c.id] = { id: c.id, name: c.name, deduct: 0, clean: 0, fair: 0, dirty: 0, days: {} }; });
    let daysSet = {};
    let totalDeduct = 0;
    Object.keys(r).forEach(function (date) {
      if (date < fromStr || date > toStr) return;
      const day = r[date];
      Object.keys(day).forEach(function (cid) {
        if (!per[cid]) return;
        const areas = day[cid];
        Object.keys(areas).forEach(function (a) {
          const rec = areas[a];
          const d = rec.deduction || 0;
          per[cid].deduct += d;
          totalDeduct += d;
          if (rec.status === 'clean') per[cid].clean++;
          else if (rec.status === 'fair') per[cid].fair++;
          else if (rec.status === 'dirty') per[cid].dirty++;
          per[cid].days[date] = 1;
          daysSet[date] = 1;
        });
      });
    });
    const list = classes.map(function (c) { return per[c.id]; });
    list.sort(function (a, b) { return a.deduct - b.deduct; });
    const days = Object.keys(daysSet).length;
    return { list: list, days: days, totalDeduct: totalDeduct, avg: days ? (totalDeduct / days).toFixed(1) : '0' };
  },

  exportAll() {
    return JSON.stringify({ classes: Store.getClasses(), records: Store.getRecords(), settings: Store.getSettings(), exportedAt: new Date().toISOString() });
  },

  importAll(json) {
    const data = JSON.parse(json);
    if (!data || typeof data !== 'object') throw new Error('数据格式错误');
    if (Array.isArray(data.classes)) Store.saveClasses(data.classes);
    if (data.records && typeof data.records === 'object') Store.saveRecords(data.records);
    if (data.settings && typeof data.settings === 'object') Store.saveSettings(Object.assign({}, DEFAULT_SETTINGS, data.settings));
  }
};

/* ================= 全局状态 ================= */
const state = {
  view: 'check',
  checkDate: todayStr(),
  recDate: todayStr(),
  statsRange: 'week',
  areaTarget: null,   // { date, classId, area }
  editingClassId: null
};

/* ================= DOM 快捷 ================= */
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

  const classes = Store.getClasses();
  const sum = Store.daySummary(state.checkDate);
  $('sum-checked').textContent = sum.checked;
  $('sum-deduct').textContent = sum.deduct;
  $('sum-total').textContent = sum.total;

  const listEl = $('check-class-list');
  const emptyEl = $('check-empty');
  if (classes.length === 0) {
    listEl.innerHTML = '';
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  let html = '';
  classes.forEach(function (c) {
    const cd = sum.classDeduct[c.id] || 0;
    let areasHtml = '';
    (c.areas || []).forEach(function (a) {
      const rec = Store.getAreaRec(state.checkDate, c.id, a);
      const status = rec ? rec.status : 'clean';
      const deduction = rec ? (rec.deduction || 0) : 0;
      const statusLabel = status === 'clean' ? '干净' : (status === 'fair' ? '一般' : '差');
      const statusCls = status === 'clean' ? 'clean' : (status === 'fair' ? 'fair' : 'dirty');
      const deductText = deduction > 0 ? ' -' + deduction : '';
      const reason = rec && rec.reason ? '<span class="area-reason">' + esc(rec.reason) + '</span>' : '';
      areasHtml += '<button class="area-chip ' + statusCls + '" data-classid="' + c.id + '" data-area="' + esc(a) + '">' +
        '<span class="area-name">' + esc(a) + '</span>' +
        '<span class="area-status">' + statusLabel + deductText + '</span>' + reason +
        '</button>';
    });
    html += '<div class="class-card">' +
      '<div class="class-head"><span class="class-name">' + esc(c.name) + '</span>' +
      '<span class="class-deduct' + (cd > 0 ? ' has' : '') + '">' + (cd > 0 ? '扣 ' + cd + ' 分' : '无扣分') + '</span></div>' +
      '<div class="area-grid">' + areasHtml + '</div>' +
      '</div>';
  });
  listEl.innerHTML = html;
}

function onAreaChipClick(classId, area) {
  state.areaTarget = { date: state.checkDate, classId: classId, area: area };
  const rec = Store.getAreaRec(state.checkDate, classId, area);
  const status = rec ? rec.status : 'clean';
  const reason = rec ? (rec.reason || '') : '';
  openAreaSheet(area, status, reason);
}

function openAreaSheet(area, status, reason) {
  $('area-sheet-title').textContent = area;
  const st = Store.getSettings();
  $('opt-fair-deduct').textContent = '-' + st.fairDeduction;
  $('opt-dirty-deduct').textContent = '-' + st.dirtyDeduction;
  setStatusSelection(status);
  $('area-reason').value = reason || '';
  $('reason-box').hidden = (status === 'clean');
  $('area-mask').hidden = false;
  $('area-sheet').hidden = false;
  $('area-sheet').classList.add('open');
}

function setStatusSelection(status) {
  document.querySelectorAll('.status-opt').forEach(function (b) {
    b.classList.toggle('sel', b.dataset.status === status);
  });
}

function onAreaSave() {
  const t = state.areaTarget;
  if (!t) return;
  const sel = document.querySelector('.status-opt.sel');
  const status = sel ? sel.dataset.status : 'clean';
  const reason = $('area-reason').value.trim();
  const rec = { status: status, deduction: Store.deductionFor(status), reason: reason };
  if (status === 'clean' && !reason) {
    Store.delAreaRec(t.date, t.classId, t.area);
  } else {
    Store.setAreaRec(t.date, t.classId, t.area, rec);
  }
  closeAreaSheet();
  renderCheck();
  toast('已保存');
}

function closeAreaSheet() {
  $('area-mask').hidden = true;
  $('area-sheet').hidden = true;
  $('area-sheet').classList.remove('open');
}

function cleanAllToday() {
  if (!confirm('将「' + dateText(state.checkDate) + '」当天所有区域标记为干净（清除扣分）？')) return;
  Store.clearDay(state.checkDate);
  renderCheck();
  toast('已全部标记为干净');
}

function copySummary() {
  const classes = Store.getClasses();
  if (classes.length === 0) { toast('还没有班级'); return; }
  const sum = Store.daySummary(state.checkDate);
  let lines = [];
  lines.push(dateText(state.checkDate) + ' ' + weekdayCN(state.checkDate) + ' 卫生检查');
  classes.forEach(function (c) {
    let parts = [];
    (c.areas || []).forEach(function (a) {
      const rec = Store.getAreaRec(state.checkDate, c.id, a);
      if (rec && rec.status !== 'clean') {
        let s = a + '-' + (rec.status === 'fair' ? '一般' : '差') + '(-' + (rec.deduction || 0) + ')';
        if (rec.reason) s += rec.reason;
        parts.push(s);
      }
    });
    lines.push(c.name + '：' + (parts.length ? parts.join('，') : '全部干净'));
  });
  lines.push('共扣 ' + sum.deduct + ' 分');
  const text = lines.join('\n');
  copyText(text);
}

function copyText(text) {
  function done() { toast('已复制到剪贴板'); }
  function fallback() {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { toast('复制失败，请手动复制'); }
    document.body.removeChild(ta);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(fallback);
  } else { fallback(); }
}

/* ================= 记录页 ================= */
function renderRecords() {
  $('rec-date-text').textContent = dateText(state.recDate);
  $('rec-week-text').textContent = weekdayCN(state.recDate);

  const classes = Store.getClasses();
  const r = Store.getRecords();
  const day = r[state.recDate] || {};
  const listEl = $('rec-list');
  const emptyEl = $('rec-empty');

  let html = '';
  let any = false;
  classes.forEach(function (c) {
    const areas = day[c.id] || {};
    const keys = Object.keys(areas).filter(function (k) { return areas[k].status !== 'clean'; });
    if (keys.length === 0) return;
    any = true;
    let cd = 0;
    let rows = '';
    keys.forEach(function (a) {
      const rec = areas[a];
      cd += (rec.deduction || 0);
      const statusLabel = rec.status === 'fair' ? '一般' : '差';
      const cls = rec.status === 'fair' ? 'fair' : 'dirty';
      rows += '<div class="rec-row">' +
        '<span class="rec-status ' + cls + '">' + statusLabel + '</span>' +
        '<span class="rec-area">' + esc(a) + '</span>' +
        '<span class="rec-deduct">-' + (rec.deduction || 0) + '</span>' +
        (rec.reason ? '<span class="rec-reason">' + esc(rec.reason) + '</span>' : '') +
        '<button class="rec-del" data-classid="' + c.id + '" data-area="' + esc(a) + '">✕</button>' +
        '</div>';
    });
    html += '<div class="class-card">' +
      '<div class="class-head"><span class="class-name">' + esc(c.name) + '</span>' +
      '<span class="class-deduct has">扣 ' + cd + ' 分</span></div>' + rows + '</div>';
  });
  listEl.innerHTML = html;
  emptyEl.hidden = any;
}

/* ================= 统计页 ================= */
function statsRangeDates() {
  const t = todayStr();
  const today = parseDate(t);
  if (state.statsRange === 'all') return { from: '0000-00-00', to: t };
  if (state.statsRange === 'week') {
    const dow = today.getDay() === 0 ? 6 : today.getDay() - 1; // 周一=0
    return { from: addDays(t, -dow), to: t };
  }
  // month
  const from = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-01';
  return { from: from, to: t };
}

function renderStats() {
  document.querySelectorAll('#stats-range .seg').forEach(function (b) {
    b.classList.toggle('active', b.dataset.range === state.statsRange);
  });
  const range = statsRangeDates();
  const s = Store.summarize(range.from, range.to);

  $('stat-days').textContent = s.days;
  $('stat-total-deduct').textContent = s.totalDeduct;
  $('stat-avg').textContent = s.avg;

  const listEl = $('stats-rank-list');
  const emptyEl = $('stats-empty');
  const hasClasses = s.list.length > 0;
  const hasData = s.list.some(function (c) { return c.deduct > 0; });

  if (!hasClasses) {
    listEl.innerHTML = '';
    emptyEl.hidden = false;
    document.querySelector('#stats-empty p').textContent = '还没有班级';
    return;
  }
  if (!hasData) {
    listEl.innerHTML = '';
    emptyEl.hidden = false;
    document.querySelector('#stats-empty p').textContent = '该时段内暂无扣分记录';
    return;
  }
  emptyEl.hidden = true;

  const maxDeduct = Math.max.apply(null, s.list.map(function (c) { return c.deduct; })) || 1;
  let html = '';
  s.list.forEach(function (c, i) {
    const pct = Math.round(c.deduct / maxDeduct * 100);
    const medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : '<span class="rank-num">' + (i + 1) + '</span>'));
    html += '<div class="rank-row">' +
      '<span class="rank-medal">' + medal + '</span>' +
      '<span class="rank-name">' + esc(c.name) + '</span>' +
      '<span class="rank-bar-wrap"><span class="rank-bar" style="width:' + pct + '%"></span></span>' +
      '<span class="rank-deduct">' + (c.deduct > 0 ? '-' + c.deduct : '0') + '</span>' +
      '</div>';
  });
  listEl.innerHTML = html;
}

/* ================= 设置页 ================= */
function renderSettings() {
  // 扣分规则
  const st = Store.getSettings();
  $('rule-fair').textContent = st.fairDeduction;
  $('rule-dirty').textContent = st.dirtyDeduction;
  $('rule-full').textContent = st.fullScore;

  // 班级管理列表
  const classes = Store.getClasses();
  const listEl = $('class-manage-list');
  let html = '';
  classes.forEach(function (c) {
    html += '<div class="class-row" data-id="' + c.id + '">' +
      '<div class="class-row-main"><span class="class-row-name">' + esc(c.name) + '</span>' +
      '<span class="class-row-areas">' + esc((c.areas || []).join('、') || '未设置区域') + '</span></div>' +
      '<span class="class-row-edit">编辑 ›</span></div>';
  });
  listEl.innerHTML = html;
}

function openClassSheet(editingId) {
  state.editingClassId = editingId;
  const isEdit = !!editingId;
  $('class-sheet-title').textContent = isEdit ? '编辑班级' : '添加班级';
  $('class-delete').hidden = !isEdit;
  $('class-name').value = '';
  renderClassTags([]);
  if (isEdit) {
    const c = Store.getClasses().filter(function (x) { return x.id === editingId; })[0];
    if (c) {
      $('class-name').value = c.name;
      renderClassTags(c.areas || []);
    }
  }
  $('class-mask').hidden = false;
  $('class-sheet').hidden = false;
  $('class-sheet').classList.add('open');
}

let classTempAreas = [];
function renderClassTags(areas) {
  classTempAreas = areas.slice();
  const el = $('class-area-tags');
  if (classTempAreas.length === 0) { el.innerHTML = '<span class="area-tag-empty">暂无区域，请在下方添加</span>'; return; }
  let html = '';
  classTempAreas.forEach(function (a, i) {
    html += '<span class="area-tag">' + esc(a) + '<button class="tag-del" data-idx="' + i + '">✕</button></span>';
  });
  el.innerHTML = html;
}

function onClassAreaAdd() {
  const inp = $('class-area-input');
  const val = inp.value.trim();
  if (!val) { toast('请输入区域名称'); return; }
  if (classTempAreas.indexOf(val) >= 0) { toast('区域已存在'); return; }
  classTempAreas.push(val);
  renderClassTags(classTempAreas);
  inp.value = '';
}

function onClassSave() {
  const name = $('class-name').value.trim();
  if (!name) { toast('请输入班级名称'); return; }
  if (classTempAreas.length === 0) { toast('请至少添加一个区域'); return; }
  const classes = Store.getClasses();
  if (state.editingClassId) {
    classes.forEach(function (c) {
      if (c.id === state.editingClassId) { c.name = name; c.areas = classTempAreas.slice(); }
    });
  } else {
    classes.push({ id: uid(), name: name, areas: classTempAreas.slice() });
  }
  Store.saveClasses(classes);
  closeClassSheet();
  renderSettings();
  toast('已保存');
}

function onClassDelete() {
  if (!state.editingClassId) return;
  const c = Store.getClasses().filter(function (x) { return x.id === state.editingClassId; })[0];
  if (!confirm('确定删除班级「' + (c ? c.name : '') + '」？相关记录将一并删除。')) return;
  let classes = Store.getClasses().filter(function (x) { return x.id !== state.editingClassId; });
  Store.saveClasses(classes);
  // 删除相关记录
  const r = Store.getRecords();
  Object.keys(r).forEach(function (date) {
    if (r[date][state.editingClassId]) {
      delete r[date][state.editingClassId];
      if (Object.keys(r[date]).length === 0) delete r[date];
    }
  });
  Store.saveRecords(r);
  closeClassSheet();
  renderSettings();
  toast('已删除');
}

function closeClassSheet() {
  $('class-mask').hidden = true;
  $('class-sheet').hidden = true;
  $('class-sheet').classList.remove('open');
  state.editingClassId = null;
}

function stepRule(step, dir) {
  const st = Store.getSettings();
  if (step === 'fair') st.fairDeduction = Math.max(0, st.fairDeduction + dir);
  else if (step === 'dirty') st.dirtyDeduction = Math.max(0, st.dirtyDeduction + dir);
  else if (step === 'full') st.fullScore = Math.max(10, st.fullScore + dir);
  Store.saveSettings(st);
  renderSettings();
}

function exportData() {
  const blob = new Blob([Store.exportAll()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '卫生检查数据_' + todayStr() + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('已导出');
}

function importData() {
  $('import-file').click();
}

function clearAllData() {
  if (!confirm('确定清空全部数据（班级、记录、设置）？此操作不可恢复，建议先导出备份。')) return;
  localStorage.removeItem(KEY_CLASSES);
  localStorage.removeItem(KEY_RECORDS);
  localStorage.removeItem(KEY_SETTINGS);
  renderSettings();
  renderCheck();
  toast('已清空');
}

/* ================= 事件绑定 ================= */
function bindEvents() {
  // tab 切换
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () { switchView(t.dataset.view); });
  });

  // 检查页日期
  $('check-prev').addEventListener('click', function () { state.checkDate = addDays(state.checkDate, -1); renderCheck(); });
  $('check-next').addEventListener('click', function () { state.checkDate = addDays(state.checkDate, 1); renderCheck(); });
  $('btn-clean-all').addEventListener('click', cleanAllToday);
  $('btn-undo-all').addEventListener('click', copySummary);
  $('empty-go-settings').addEventListener('click', function () { switchView('settings'); });

  // 检查页区域点击（事件委托）
  $('check-class-list').addEventListener('click', function (e) {
    const chip = e.target.closest('.area-chip');
    if (chip) onAreaChipClick(chip.dataset.classid, chip.dataset.area);
  });

  // 记录页日期
  $('rec-prev').addEventListener('click', function () { state.recDate = addDays(state.recDate, -1); renderRecords(); });
  $('rec-next').addEventListener('click', function () { state.recDate = addDays(state.recDate, 1); renderRecords(); });
  $('rec-list').addEventListener('click', function (e) {
    const del = e.target.closest('.rec-del');
    if (!del) return;
    if (confirm('删除该区域记录？')) {
      Store.delAreaRec(state.recDate, del.dataset.classid, del.dataset.area);
      renderRecords();
      toast('已删除');
    }
  });

  // 统计页范围切换
  document.querySelectorAll('#stats-range .seg').forEach(function (b) {
    b.addEventListener('click', function () { state.statsRange = b.dataset.range; renderStats(); });
  });

  // 设置页
  $('btn-add-class').addEventListener('click', function () { openClassSheet(null); });
  $('class-manage-list').addEventListener('click', function (e) {
    const row = e.target.closest('.class-row');
    if (row) openClassSheet(row.dataset.id);
  });
  document.querySelectorAll('.stepper button').forEach(function (b) {
    b.addEventListener('click', function () { stepRule(b.dataset.step, parseInt(b.dataset.dir, 10)); });
  });
  $('btn-export').addEventListener('click', exportData);
  $('btn-copy').addEventListener('click', function () { copyText(Store.exportAll()); });
  $('btn-import').addEventListener('click', importData);
  $('btn-clear-all').addEventListener('click', clearAllData);
  $('import-file').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        Store.importAll(reader.result);
        renderSettings(); renderCheck(); renderRecords(); renderStats();
        toast('导入成功');
      } catch (err) { toast('导入失败：' + err.message); }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // 区域弹层
  $('area-mask').addEventListener('click', closeAreaSheet);
  $('area-cancel').addEventListener('click', closeAreaSheet);
  $('area-save').addEventListener('click', onAreaSave);
  document.querySelectorAll('.status-opt').forEach(function (b) {
    b.addEventListener('click', function () {
      setStatusSelection(b.dataset.status);
      $('reason-box').hidden = (b.dataset.status === 'clean');
    });
  });

  // 班级弹层
  $('class-mask').addEventListener('click', closeClassSheet);
  $('class-cancel').addEventListener('click', closeClassSheet);
  $('class-save').addEventListener('click', onClassSave);
  $('class-delete').addEventListener('click', onClassDelete);
  $('class-area-add').addEventListener('click', onClassAreaAdd);
  $('class-area-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); onClassAreaAdd(); } });
  $('class-area-tags').addEventListener('click', function (e) {
    const del = e.target.closest('.tag-del');
    if (!del) return;
    classTempAreas.splice(parseInt(del.dataset.idx, 10), 1);
    renderClassTags(classTempAreas);
  });
}

/* ================= 初始化 ================= */
function init() {
  // 把第二个快捷按钮文案改为「复制汇总」
  $('btn-undo-all').textContent = '📋 复制汇总';
  bindEvents();
  renderCheck();
  // 注册 Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(function () {});
  }
}

document.addEventListener('DOMContentLoaded', init);