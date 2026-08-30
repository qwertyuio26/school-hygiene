'use strict';

/* ================= 工具 ================= */
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function uid(p) { return p + '_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function todayStr() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function addDays(dateStr, n) {
  var p = dateStr.split('-');
  var d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10) + n);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function dateText(s) { var p = s.split('-'); return p[0] + '年' + parseInt(p[1], 10) + '月' + parseInt(p[2], 10) + '日'; }
function weekdayCN(s) { var p = s.split('-'); var d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)); return '周' + '日一二三四五六'[d.getDay()]; }
function nowTime() { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
function weekStartStr() { var d = new Date(); var day = d.getDay() || 7; d.setDate(d.getDate() - day + 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function monthStartStr() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-01'; }
function classSortKey(name) {
  var m = name.match(/^([七八九])(\d+)/);
  if (!m) return name;
  var g = '七八九'.indexOf(m[1]) + 7;
  return String(g) + '-' + String(parseInt(m[2], 10)).padStart(2, '0');
}

/* ================= 评分配置 ================= */
var SCORE_GROUPS = [
  { id: 'classroom', name: '教室', full: 50 },
  { id: 'cleanup', name: '清洁区', full: 40 },
  { id: 'personal', name: '个人卫生', full: 10 }
];
var SCORE_ITEMS = [
  { id: 'c_floor', group: 'classroom', name: '地面', max: 10 },
  { id: 'c_desk', group: 'classroom', name: '桌椅讲台', max: 10 },
  { id: 'c_window', group: 'classroom', name: '门窗玻璃', max: 10 },
  { id: 'c_corner', group: 'classroom', name: '卫生角和个人物品', max: 10 },
  { id: 'c_maintain', group: 'classroom', name: '平时维护', max: 10 },
  { id: 'q_floor', group: 'cleanup', name: '地面', max: 10 },
  { id: 'q_facility', group: 'cleanup', name: '公共设施', max: 10 },
  { id: 'q_green', group: 'cleanup', name: '绿化区', max: 10 },
  { id: 'q_maintain', group: 'cleanup', name: '平时维护', max: 10 },
  { id: 'personal', group: 'personal', name: '个人卫生', max: 10 }
];
function groupItems(gid) { return SCORE_ITEMS.filter(function (i) { return i.group === gid; }); }
function calcTotal(items) {
  var t = 0;
  SCORE_ITEMS.forEach(function (i) {
    var v = items[i.id];
    if (v != null) t += (typeof v === 'object' ? (v.score != null ? Number(v.score) : 0) : Number(v));
  });
  return t;
}
function itemVal(item) {
  if (!item) return null;
  return typeof item === 'object' ? (item.score != null ? item.score : null) : item;
}

/* ================= 图片存储 (IndexedDB) ================= */
var ImgDB = {
  _open: function () {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open('hygiene_imgs', 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains('imgs')) db.createObjectStore('imgs');
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  },
  put: function (id, data) {
    return this._open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('imgs', 'readwrite');
        tx.objectStore('imgs').put(data, id);
        tx.oncomplete = function () { db.close(); resolve(); };
        tx.onerror = function () { db.close(); reject(tx.error); };
      });
    });
  },
  get: function (id) {
    return this._open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var req = db.transaction('imgs').objectStore('imgs').get(id);
        req.onsuccess = function () { db.close(); resolve(req.result); };
        req.onerror = function () { db.close(); reject(req.error); };
      });
    });
  },
  del: function (id) {
    return this._open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('imgs', 'readwrite');
        tx.objectStore('imgs').delete(id);
        tx.oncomplete = function () { db.close(); resolve(); };
        tx.onerror = function () { db.close(); reject(tx.error); };
      });
    });
  },
  clear: function () {
    return this._open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('imgs', 'readwrite');
        tx.objectStore('imgs').clear();
        tx.oncomplete = function () { db.close(); resolve(); };
        tx.onerror = function () { db.close(); reject(tx.error); };
      });
    });
  }
};
function compressImage(file, cb) {
  var img = new Image();
  var url = URL.createObjectURL(file);
  img.onload = function () {
    URL.revokeObjectURL(url);
    var w = img.width, h = img.height;
    var max = 1280;
    if (w > max || h > max) {
      if (w > h) { h = Math.round(h * max / w); w = max; }
      else { w = Math.round(w * max / h); h = max; }
    }
    var canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    cb(canvas.toDataURL('image/jpeg', 0.7));
  };
  img.onerror = function () { URL.revokeObjectURL(url); cb(null); };
  img.src = url;
}

function itemProblems(rec) {
  var out = [];
  if (!rec || !rec.items) return out;
  SCORE_ITEMS.forEach(function (it) {
    var item = rec.items[it.id];
    if (!item) return;
    var has = item.note || (item.imgIds && item.imgIds.length) || (item.score != null && Number(item.score) < it.max);
    if (has) {
      var g = SCORE_GROUPS.filter(function (x) { return x.id === it.group; })[0];
      out.push({ groupName: g ? g.name : '', name: it.name, score: item.score, max: it.max, note: item.note, imgIds: item.imgIds || [] });
    }
  });
  return out;
}

/* ================= 预置数据 ================= */
var DEFAULT_CLASSES = [
  { id: 'c01', name: '九2 杨明仙' }, { id: 'c02', name: '七6 熊贵云' }, { id: 'c03', name: '九7 左丽' },
  { id: 'c04', name: '八4 杨梅' }, { id: 'c05', name: '九3 胡旺' }, { id: 'c06', name: '八6 陈英权' },
  { id: 'c07', name: '九6 徐勇' }, { id: 'c08', name: '九1 周美' }, { id: 'c09', name: '八1 陈大超' },
  { id: 'c10', name: '八5 柳大远' }, { id: 'c11', name: '八3 王巧' }, { id: 'c12', name: '八2 李良贵' },
  { id: 'c13', name: '七1 罗富' }, { id: 'c14', name: '八7 刘义春' }, { id: 'c15', name: '九5 黄启龙' },
  { id: 'c16', name: '七4 雪莲' }, { id: 'c17', name: '九4 杨松' }, { id: 'c18', name: '七3 黄苇' },
  { id: 'c19', name: '七7 陈兴' }, { id: 'c20', name: '七5 刘玲' }, { id: 'c21', name: '七2 张莹' }
];
var DEFAULT_NOTES = ['不干净', '未打扫', '有垃圾', '灰尘多', '摆放不整齐', '有污渍', '门窗未擦', '未及时维护'];

/* ================= 存储 ================= */
var KEYS = { classes: 'h6_classes', notes: 'h6_notes', records: 'h6_records' };
function read(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { toast('存储空间不足'); } }
var Store = {
  seed: function () {
    if (read(KEYS.classes) == null) write(KEYS.classes, DEFAULT_CLASSES.map(function (c) { return { id: c.id, name: c.name }; }));
    if (read(KEYS.notes) == null) write(KEYS.notes, DEFAULT_NOTES.map(function (n, i) { return { id: 'n' + (i + 1), name: n }; }));
    if (read(KEYS.records) == null) write(KEYS.records, {});
    var r = read(KEYS.records);
    var dates = r ? Object.keys(r) : [];
    var needsMigrate = false;
    for (var i = 0; i < dates.length; i++) {
      var day = r[dates[i]];
      var cids = Object.keys(day);
      for (var j = 0; j < cids.length; j++) {
        if (day[cids[j]] && day[cids[j]].scores) { needsMigrate = true; break; }
      }
      if (needsMigrate) break;
    }
    if (needsMigrate) {
      dates.forEach(function (date) {
        Object.keys(r[date]).forEach(function (cid) {
          var rec = r[date][cid];
          if (rec && rec.scores) {
            var items = {};
            SCORE_ITEMS.forEach(function (it) {
              items[it.id] = { score: rec.scores[it.id] != null ? rec.scores[it.id] : it.max, note: '', imgIds: [] };
            });
            var nr = { items: items, time: rec.time || '' };
            if (rec.note) nr.note = rec.note;
            if (rec.imgIds && rec.imgIds.length) nr.imgIds = rec.imgIds;
            r[date][cid] = nr;
          }
        });
      });
      write(KEYS.records, r);
    }
  },
  getClasses: function () { return read(KEYS.classes) || []; },
  saveClasses: function (v) { write(KEYS.classes, v); },
  getClassName: function (id) { var c = this.getClasses().filter(function (x) { return x.id === id; })[0]; return c ? c.name : ''; },
  getNotes: function () { return read(KEYS.notes) || []; },
  saveNotes: function (v) { write(KEYS.notes, v); },
  getRecords: function () { return read(KEYS.records) || {}; },
  saveRecords: function (v) { write(KEYS.records, v); },
  getDay: function (date) { var r = this.getRecords(); return r[date] || {}; },
  getDayClass: function (date, classId) { return this.getDay(date)[classId] || null; },
  setDayClass: function (date, classId, rec) {
    var r = this.getRecords();
    if (!r[date]) r[date] = {};
    r[date][classId] = rec;
    this.saveRecords(r);
  },
  delDayClass: function (date, classId) {
    var r = this.getRecords();
    if (r[date] && r[date][classId]) {
      var rec = r[date][classId];
      (rec.imgIds || []).forEach(function (id) { ImgDB.del(id).catch(function () {}); });
      delete r[date][classId];
      if (!Object.keys(r[date]).length) delete r[date];
      this.saveRecords(r);
    }
  },
  clearDay: function (date) {
    var r = this.getRecords();
    if (r[date]) {
      Object.keys(r[date]).forEach(function (cid) {
        var rec = r[date][cid];
        (rec.imgIds || []).forEach(function (id) { ImgDB.del(id).catch(function () {}); });
      });
      delete r[date];
      this.saveRecords(r);
    }
  },
  daySummary: function (date) {
    var day = this.getDay(date);
    var classes = this.getClasses();
    var done = 0, sum = 0, top = 0;
    classes.forEach(function (c) {
      var rec = day[c.id];
      if (rec) { done++; var t = calcTotal(rec.items || rec.scores); sum += t; if (t > top) top = t; }
    });
    return { done: done, avg: done ? Math.round(sum / done * 10) / 10 : 0, top: top, total: classes.length };
  },
  summarize: function (fromStr, toStr) {
    var r = this.getRecords();
    var classes = this.getClasses();
    var result = {};
    classes.forEach(function (c) { result[c.id] = { days: 0, sum: 0, roomSum: 0, cleanSum: 0, personalSum: 0, roomDays: 0, cleanDays: 0, personalDays: 0 }; });
    var daysSet = {};
    Object.keys(r).forEach(function (date) {
      if (date < fromStr || date > toStr) return;
      daysSet[date] = 1;
      Object.keys(r[date]).forEach(function (cid) {
        if (!result[cid]) return;
        var rec = r[date][cid];
        var t = calcTotal(rec.items || rec.scores);
        result[cid].days++;
        result[cid].sum += t;
        SCORE_GROUPS.forEach(function (g) {
          var gs = 0, has = false;
          SCORE_ITEMS.forEach(function (it) {
            var v = itemVal(rec.items ? rec.items[it.id] : rec.scores[it.id]);
            if (it.group === g.id && v != null) { gs += Number(v); has = true; }
          });
          if (has) {
            if (g.id === 'classroom') { result[cid].roomSum += gs; result[cid].roomDays++; }
            else if (g.id === 'cleanup') { result[cid].cleanSum += gs; result[cid].cleanDays++; }
            else { result[cid].personalSum += gs; result[cid].personalDays++; }
          }
        });
      });
    });
    var rank = classes.map(function (c) {
      var d = result[c.id];
      return {
        id: c.id, name: c.name, days: d.days,
        avg: d.days ? Math.round(d.sum / d.days * 10) / 10 : 0,
        roomAvg: d.roomDays ? Math.round(d.roomSum / d.roomDays * 10) / 10 : 0,
        cleanAvg: d.cleanDays ? Math.round(d.cleanSum / d.cleanDays * 10) / 10 : 0,
        personalAvg: d.personalDays ? Math.round(d.personalSum / d.personalDays * 10) / 10 : 0
      };
    }).sort(function (a, b) { return b.avg - a.avg || a.name.localeCompare(b.name, 'zh'); });
    return { rank: rank, days: Object.keys(daysSet).length, classes: rank.filter(function (x) { return x.days > 0; }).length, topAvg: rank.length && rank[0].days ? rank[0].avg : 0 };
  },
  exportAll: function () {
    return JSON.stringify({ app: 'hygiene-check-v6', time: new Date().toISOString(), classes: this.getClasses(), notes: this.getNotes(), records: this.getRecords() });
  },
  importAll: function (text) {
    var d = JSON.parse(text);
    if (d && d.classes) this.saveClasses(d.classes);
    if (d && d.notes) this.saveNotes(d.notes);
    if (d && d.records) this.saveRecords(d.records);
  }
};
/* ================= 全局状态 ================= */
var state = {
  view: 'check',
  checkDate: todayStr(),
  ovDate: todayStr(),
  recDate: todayStr(),
  statsFrom: weekStartStr(),
  statsTo: todayStr(),
  statsQuick: 'week',
  statsTopN: 'all',
  scoringClassId: null,
  scoreDraft: null,
  editingClassId: null,
  editingIssueId: null
};

/* ================= Toast ================= */
var toastTimer = null;
function toast(msg) {
  var el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.hidden = true; el.classList.remove('show'); }, 1800);
}

/* ================= 视图切换 ================= */
function switchView(view) {
  state.view = view;
  document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
  document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.dataset.view === view); });
  $('view-' + view).classList.add('active');
  if (view === 'check') renderCheck();
  else if (view === 'overview') renderOverview();
  else if (view === 'records') renderRecords();
  else if (view === 'stats') renderStats();
  else if (view === 'settings') renderSettings();
}

/* ================= 检查页 ================= */
function sortedClasses() {
  return Store.getClasses().slice().sort(function (a, b) { return classSortKey(a.name).localeCompare(classSortKey(b.name)); });
}
function renderCheck() {
  $('check-date-text').textContent = dateText(state.checkDate);
  $('check-week-text').textContent = weekdayCN(state.checkDate);
  var classes = sortedClasses();
  var day = Store.getDay(state.checkDate);
  var sum = Store.daySummary(state.checkDate);
  $('sum-done').textContent = sum.done + '/' + sum.total;
  $('sum-avg').textContent = sum.avg;
  $('sum-top').textContent = sum.top;
  var listEl = $('check-class-list');
  var emptyEl = $('check-empty');
  if (!classes.length) { listEl.innerHTML = ''; emptyEl.hidden = false; return; }
  emptyEl.hidden = true;
  var html = '';
  classes.forEach(function (c) {
    var rec = day[c.id];
    var statusHtml;
    if (!rec) statusHtml = '<span class="class-state unchecked">未评分</span>';
    else statusHtml = '<span class="class-state scored">' + calcTotal(rec.items || rec.scores) + ' 分</span>';
    var note = '';
    if (rec && rec.note) note += '<div class="class-note">📝 ' + esc(rec.note) + '</div>';
    if (rec) {
      var pc = itemProblems(rec).length;
      if (pc > 0) note += '<div class="class-note warn">⚠ ' + pc + ' 项有问题</div>';
    }
    html += '<div class="class-card" data-cid="' + c.id + '">' +
      '<div class="class-card-main"><span class="class-name">' + esc(c.name) + '</span>' + note + '</div>' +
      statusHtml + '</div>';
  });
  listEl.innerHTML = html;
}
/* ================= 打分弹层 ================= */
function openScoreSheet(classId) {
  state.scoringClassId = classId;
  var cls = Store.getClasses().filter(function (x) { return x.id === classId; })[0];
  $('score-sheet-title').textContent = (cls ? cls.name : '') + ' 打分';
  var existing = Store.getDayClass(state.checkDate, classId);
  var items = {};
  SCORE_ITEMS.forEach(function (it) {
    var old = existing && existing.items ? existing.items[it.id] : null;
    items[it.id] = {
      score: old && old.score != null ? old.score : it.max,
      note: old ? (old.note || '') : '',
      imgs: [],
      oldImgIds: old && old.imgIds ? old.imgIds.slice() : []
    };
  });
  state.scoreDraft = { items: items, note: existing ? (existing.note || '') : '', noteIds: existing && existing.noteIds ? existing.noteIds.slice() : [] };
  SCORE_GROUPS.forEach(function (g) {
    var el = $('score-group-' + g.id);
    var html = '';
    groupItems(g.id).forEach(function (it) {
      var d = items[it.id];
      html += '<div class="score-row" data-item="' + it.id + '">' +
        '<div class="score-row-top"><span class="score-name">' + esc(it.name) + '</span>' +
        '<input type="number" class="score-input" data-item="' + it.id + '" min="0" max="' + it.max + '" value="' + d.score + '">' +
        '<span class="score-max">/ ' + it.max + '</span></div>' +
        '<div class="score-row-extra">' +
        '<input type="text" class="item-note" data-item="' + it.id + '" placeholder="该项备注（如：有纸屑）" maxlength="30" value="' + esc(d.note) + '">' +
        '<label class="item-img-btn"><input type="file" class="item-img-input" data-item="' + it.id + '" accept="image/*" hidden><span class="item-img-ico">📷</span></label>' +
        '</div>' +
        '<div class="item-imgs" data-item="' + it.id + '"></div>' +
        '</div>';
    });
    el.innerHTML = html;
    groupItems(g.id).forEach(function (it) { renderItemImgs(it.id); });
  });
  renderNoteChips();
  $('score-note-input').value = state.scoreDraft.note;
  $('score-total-val').textContent = calcTotal(items);
  $('score-mask').hidden = false;
  $('score-sheet').hidden = false;
}
function closeImgViewer() {
  $('img-mask').hidden = true;
  $('img-viewer').hidden = true;
  $('img-viewer-src').src = '';
}
function closeScoreSheet() {
  $('score-mask').hidden = true;
  $('score-sheet').hidden = true;
  state.scoringClassId = null;
  state.scoreDraft = null;
}
function onScoreInput() {
  if (!state.scoreDraft) return;
  SCORE_ITEMS.forEach(function (it) {
    var el = document.querySelector('.score-input[data-item="' + it.id + '"]');
    if (el) {
      var v = parseInt(el.value, 10);
      if (isNaN(v) || v < 0) v = 0;
      if (v > it.max) v = it.max;
      state.scoreDraft.items[it.id].score = v;
    }
  });
  $('score-total-val').textContent = calcTotal(state.scoreDraft.items);
}
function renderNoteChips() {
  var notes = Store.getNotes();
  var draft = state.scoreDraft;
  var el = $('score-note-chips');
  var html = '';
  notes.forEach(function (n) {
    var on = draft.noteIds.indexOf(n.id) >= 0;
    html += '<span class="note-chip' + (on ? ' sel' : '') + '" data-nid="' + n.id + '">' + esc(n.name) + '</span>';
  });
  el.innerHTML = html;
}
function toggleNoteChip(nid) {
  var draft = state.scoreDraft;
  var idx = draft.noteIds.indexOf(nid);
  if (idx >= 0) draft.noteIds.splice(idx, 1);
  else draft.noteIds.push(nid);
  var noteNames = draft.noteIds.map(function (id) {
    var n = Store.getNotes().filter(function (x) { return x.id === id; })[0];
    return n ? n.name : '';
  }).filter(Boolean);
  draft.note = noteNames.join('、');
  $('score-note-input').value = draft.note;
  renderNoteChips();
}
function renderItemImgs(itemId) {
  var d = state.scoreDraft.items[itemId];
  var el = document.querySelector('.item-imgs[data-item="' + itemId + '"]');
  if (!el) return;
  var html = '';
  (d.imgs || []).forEach(function (data, i) {
    html += '<div class="img-thumb"><img src="' + data + '" alt=""><span class="img-thumb-del" data-item="' + itemId + '" data-kind="new" data-idx="' + i + '">✕</span></div>';
  });
  (d.oldImgIds || []).forEach(function (id, i) {
    html += '<div class="img-thumb"><img data-imgid="' + id + '" alt=""><span class="img-thumb-del" data-item="' + itemId + '" data-kind="old" data-idx="' + i + '">✕</span></div>';
  });
  el.innerHTML = html;
  (d.oldImgIds || []).forEach(function (id) {
    ImgDB.get(id).then(function (data) {
      var imgs = el.querySelectorAll('.img-thumb img');
      for (var k = 0; k < imgs.length; k++) {
        if (imgs[k].dataset.imgid === id) { imgs[k].src = data; break; }
      }
    }).catch(function () {});
  });
}
function handleItemImgFile(itemId, file) {
  var d = state.scoreDraft.items[itemId];
  if (!d) return;
  if ((d.imgs.length + d.oldImgIds.length) >= 3) { toast('该项最多 3 张照片'); return; }
  compressImage(file, function (data) {
    if (!data) { toast('图片处理失败'); return; }
    d.imgs.push(data);
    renderItemImgs(itemId);
  });
}
function delItemImg(itemId, kind, idx) {
  var d = state.scoreDraft.items[itemId];
  if (!d) return;
  if (kind === 'new') d.imgs.splice(idx, 1);
  else {
    var id = d.oldImgIds[idx];
    d.oldImgIds.splice(idx, 1);
    ImgDB.del(id).catch(function () {});
  }
  renderItemImgs(itemId);
}

function onScoreSave() {
  var draft = state.scoreDraft;
  if (!draft) return;
  onScoreInput();
  var customNote = $('score-note-input').value.trim();
  SCORE_ITEMS.forEach(function (it) {
    var el = document.querySelector('.item-note[data-item="' + it.id + '"]');
    if (el) draft.items[it.id].note = el.value.trim();
  });
  var tasks = [];
  SCORE_ITEMS.forEach(function (it) {
    (draft.items[it.id].imgs || []).forEach(function (data) {
      tasks.push({ itemId: it.id, data: data });
    });
  });
  function finish() {
    var rec = { items: {}, time: nowTime() };
    SCORE_ITEMS.forEach(function (it) {
      var d = draft.items[it.id];
      rec.items[it.id] = { score: d.score, note: d.note || '', imgIds: d.oldImgIds ? d.oldImgIds.slice() : [] };
    });
    if (customNote) rec.note = customNote;
    Store.setDayClass(state.checkDate, state.scoringClassId, rec);
    closeScoreSheet();
    renderCheck();
    toast('已保存 ' + calcTotal(rec.items) + ' 分');
  }
  if (tasks.length) {
    var pending = tasks.length;
    tasks.forEach(function (task) {
      var id = uid('img');
      ImgDB.put(id, task.data).then(function () {
        draft.items[task.itemId].oldImgIds.push(id);
        pending--;
        if (pending === 0) finish();
      }).catch(function () { pending--; if (pending === 0) finish(); });
    });
  } else finish();
}
/* ================= 总览页 ================= */
function renderOverview() {
  $('ov-date-text').textContent = dateText(state.ovDate);
  $('ov-week-text').textContent = weekdayCN(state.ovDate);
  var classes = sortedClasses();
  var day = Store.getDay(state.ovDate);
  var el = $('ov-content');
  var scored = classes.filter(function (c) { return day[c.id]; }).map(function (c) {
    return { c: c, rec: day[c.id], total: calcTotal(day[c.id].items || day[c.id].scores) };
  }).sort(function (a, b) { return b.total - a.total; });
  if (!scored.length) {
    el.innerHTML = '<div class="ov-clean"><div class="ov-clean-emoji">🎉</div><p>当天暂无评分</p><p class="ov-clean-sub">所有班级尚未打分</p></div>';
    return;
  }
  var html = '';
  var medals = ['🥇', '🥈', '🥉'];
  scored.forEach(function (s, i) {
    var rankTxt = i < 3 ? medals[i] : (i + 1) + '';
    var problems = itemProblems(s.rec);
    var problemsHtml = '';
    if (problems.length) {
      problemsHtml = '<div class="ov-problems">' + problems.map(function (p) {
        var imgs = p.imgIds.map(function (id) {
          return '<img class="ov-img" data-imgid="' + id + '" src="" alt="问题照片">';
        }).join('');
        return '<div class="ov-problem"><span class="ov-problem-name">' + esc(p.groupName) + '·' + esc(p.name) + '</span>' +
          (p.score != null && Number(p.score) < p.max ? '<span class="ov-problem-score">' + p.score + '/' + p.max + '</span>' : '') +
          (p.note ? '<span class="ov-problem-note">' + esc(p.note) + '</span>' : '') +
          (imgs ? '<span class="ov-imgs">' + imgs + '</span>' : '') +
          '</div>';
      }).join('') + '</div>';
    }
    var note = s.rec.note ? '<div class="ov-issues"><span class="ov-issue">📝 ' + esc(s.rec.note) + '</span></div>' : '';
    html += '<div class="ov-row"><div class="ov-head"><span class="ov-rank">' + rankTxt + '</span>' +
      '<span class="ov-area">' + esc(s.c.name) + '</span>' +
      '<span class="ov-deduct">' + s.total + ' 分</span></div>' + problemsHtml + note + '</div>';
  });
  var sum = 0;
  scored.forEach(function (s) { sum += s.total; });
  var avg = Math.round(sum / scored.length * 10) / 10;
  html += '<div class="ov-total">共 <b>' + scored.length + '</b> 个班级参评，平均 <b>' + avg + '</b> 分<br><span class="ov-total-sub">每班满分 100 分</span></div>';
  el.innerHTML = html;
  el.querySelectorAll('.ov-img').forEach(function (img) {
    ImgDB.get(img.dataset.imgid).then(function (data) { if (data && img.isConnected) img.src = data; }).catch(function () {});
  });
}

/* ================= 记录页 ================= */
function renderRecords() {
  $('rec-date-text').textContent = dateText(state.recDate);
  $('rec-week-text').textContent = weekdayCN(state.recDate);
  var day = Store.getDay(state.recDate);
  var classes = sortedClasses();
  var el = $('rec-list');
  var emptyEl = $('rec-empty');
  var scored = classes.filter(function (c) { return day[c.id]; });
  if (!scored.length) { el.innerHTML = ''; emptyEl.hidden = false; return; }
  emptyEl.hidden = true;
  var html = '';
  scored.forEach(function (c) {
    var rec = day[c.id];
    var total = calcTotal(rec.items || rec.scores);
    var itemsHtml = '';
    SCORE_GROUPS.forEach(function (g) {
      var names = groupItems(g.id).map(function (it) {
        var item = rec.items ? rec.items[it.id] : null;
        var v = item ? item.score : '-';
        var n = item && item.note ? '（' + item.note + '）' : '';
        return it.name + ' ' + v + n;
      }).join(' · ');
      itemsHtml += '<div class="rec-group"><span class="rec-group-name">' + g.name + '</span><span class="rec-group-vals">' + esc(names) + '</span></div>';
    });
    var note = rec.note ? '<div class="rec-note">📝 ' + esc(rec.note) + '</div>' : '';
    var imgsHtml = '';
    if (rec.items) {
      SCORE_ITEMS.forEach(function (it) {
        var item = rec.items[it.id];
        if (item && item.imgIds && item.imgIds.length) {
          item.imgIds.forEach(function (id) { imgsHtml += '<img class="rec-img" data-imgid="' + id + '" src="" alt="问题照片">'; });
        }
      });
      if (imgsHtml) imgsHtml = '<div class="rec-imgs">' + imgsHtml + '</div>';
    }
    html += '<div class="rec-card" data-cid="' + c.id + '">' +
      '<div class="rec-head"><span class="rec-class">' + esc(c.name) + '</span>' +
      '<span class="rec-total">' + total + ' 分</span>' +
      '<button class="rec-del" data-cid="' + c.id + '" aria-label="删除">✕</button></div>' +
      itemsHtml + note + imgsHtml +
      '<div class="rec-time">' + esc(rec.time || '') + '</div></div>';
  });
  el.innerHTML = html;
  el.querySelectorAll('.rec-img').forEach(function (img) {
    ImgDB.get(img.dataset.imgid).then(function (data) { if (data && img.isConnected) img.src = data; }).catch(function () {});
  });
}
/* ================= 统计页 ================= */
function renderStats() {
  document.querySelectorAll('#stats-quick .seg').forEach(function (b) { b.classList.toggle('active', b.dataset.q === state.statsQuick); });
  document.querySelectorAll('#stats-topn .seg').forEach(function (b) { b.classList.toggle('active', b.dataset.n === state.statsTopN); });
  $('stats-from').value = state.statsFrom === '0000-00-00' ? '' : state.statsFrom;
  $('stats-to').value = state.statsTo === '9999-12-31' ? '' : state.statsTo;
  var s = Store.summarize(state.statsFrom, state.statsTo);
  $('stat-days').textContent = s.days;
  $('stat-classes').textContent = s.classes;
  $('stat-top-avg').textContent = s.topAvg;
  var listEl = $('stats-rank-list');
  var emptyEl = $('stats-empty');
  var ranked = s.rank.filter(function (x) { return x.days > 0; });
  if (!ranked.length) { listEl.innerHTML = ''; emptyEl.hidden = false; return; }
  emptyEl.hidden = true;
  var topN = state.statsTopN === '10' ? 10 : ranked.length;
  var html = '';
  var medals = ['🥇', '🥈', '🥉'];
  for (var i = 0; i < Math.min(topN, ranked.length); i++) {
    var r = ranked[i];
    var rankTxt = i < 3 ? medals[i] : (i + 1) + '';
    html += '<div class="rank-row' + (i < 3 ? ' top' : '') + '">' +
      '<span class="rank-no">' + rankTxt + '</span>' +
      '<div class="rank-main"><span class="rank-name">' + esc(r.name) + '</span>' +
      '<span class="rank-sub">教室 ' + r.roomAvg + ' · 清洁区 ' + r.cleanAvg + ' · 个人 ' + r.personalAvg + '（' + r.days + '天）</span></div>' +
      '<span class="rank-deduct">' + r.avg + '</span></div>';
  }
  listEl.innerHTML = html;
}
/* ================= 设置页 ================= */
function renderSettings() {
  renderClassManage();
  renderIssueManage();
}
function renderClassManage() {
  var classes = sortedClasses();
  var el = $('class-manage-list');
  var html = '';
  classes.forEach(function (c) {
    html += '<div class="manage-row" data-id="' + c.id + '"><div class="manage-main"><span class="manage-name">' + esc(c.name) + '</span></div><span class="manage-edit">编辑 ›</span></div>';
  });
  el.innerHTML = html || '<div class="manage-empty">暂无班级</div>';
}
function openClassSheet(editingId) {
  state.editingClassId = editingId;
  var isEdit = !!editingId;
  $('class-sheet-title').textContent = isEdit ? '编辑班级' : '添加班级';
  $('class-delete').hidden = !isEdit;
  $('class-name').value = '';
  if (isEdit) {
    var c = Store.getClasses().filter(function (x) { return x.id === editingId; })[0];
    if (c) $('class-name').value = c.name;
  }
  $('class-mask').hidden = false;
  $('class-sheet').hidden = false;
}
function closeClassSheet() { $('class-mask').hidden = true; $('class-sheet').hidden = true; state.editingClassId = null; }
function onClassSave() {
  var name = $('class-name').value.trim();
  if (!name) { toast('请输入班级名称'); return; }
  var classes = Store.getClasses();
  if (state.editingClassId) classes.forEach(function (c) { if (c.id === state.editingClassId) c.name = name; });
  else classes.push({ id: uid('c'), name: name });
  Store.saveClasses(classes);
  closeClassSheet();
  renderSettings(); renderCheck();
  toast('已保存');
}
function onClassDelete() {
  if (!state.editingClassId) return;
  var classes = Store.getClasses().filter(function (c) { return c.id !== state.editingClassId; });
  Store.saveClasses(classes);
  closeClassSheet();
  renderSettings(); renderCheck();
  toast('已删除');
}
function renderIssueManage() {
  var notes = Store.getNotes();
  var el = $('issue-manage-list');
  var html = '';
  notes.forEach(function (n) {
    html += '<div class="manage-row" data-id="' + n.id + '"><div class="manage-main"><span class="manage-name">' + esc(n.name) + '</span></div><span class="manage-edit">编辑 ›</span></div>';
  });
  el.innerHTML = html || '<div class="manage-empty">暂无问题</div>';
}
function openIssueSheet(editingId) {
  state.editingIssueId = editingId;
  var isEdit = !!editingId;
  $('issue-sheet-title').textContent = isEdit ? '编辑问题' : '添加问题';
  $('issue-delete').hidden = !isEdit;
  $('issue-name').value = '';
  if (isEdit) {
    var n = Store.getNotes().filter(function (x) { return x.id === editingId; })[0];
    if (n) $('issue-name').value = n.name;
  }
  $('issue-mask').hidden = false;
  $('issue-sheet').hidden = false;
}
function closeIssueSheet() { $('issue-mask').hidden = true; $('issue-sheet').hidden = true; state.editingIssueId = null; }
function onIssueSave() {
  var name = $('issue-name').value.trim();
  if (!name) { toast('请输入问题描述'); return; }
  var notes = Store.getNotes();
  if (state.editingIssueId) notes.forEach(function (n) { if (n.id === state.editingIssueId) n.name = name; });
  else notes.push({ id: uid('n'), name: name });
  Store.saveNotes(notes);
  closeIssueSheet();
  renderSettings();
  toast('已保存');
}
function onIssueDelete() {
  if (!state.editingIssueId) return;
  var notes = Store.getNotes().filter(function (n) { return n.id !== state.editingIssueId; });
  Store.saveNotes(notes);
  closeIssueSheet();
  renderSettings();
  toast('已删除');
}

/* ================= 数据 ================= */
function exportData() {
  var data = Store.exportAll();
  var blob = new Blob([data], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '卫生检查数据-' + todayStr() + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  toast('已导出');
}
function copyData() {
  var data = Store.exportAll();
  function done() { toast('已复制，可在其他设备导入'); }
  function fallback() {
    var ta = document.createElement('textarea');
    ta.value = data;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { toast('复制失败，请用导出'); }
    ta.remove();
  }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(data).then(done).catch(fallback);
  else fallback();
}
function importData(file) {
  var reader = new FileReader();
  reader.onload = function () {
    try {
      Store.importAll(reader.result);
      renderSettings(); renderCheck(); renderStats();
      toast('导入成功');
    } catch (e) { toast('导入失败：格式不对'); }
  };
  reader.readAsText(file);
}
function clearAllData() {
  if (!confirm('确定清空全部数据？此操作不可恢复！')) return;
  localStorage.removeItem(KEYS.classes);
  localStorage.removeItem(KEYS.notes);
  localStorage.removeItem(KEYS.records);
  ImgDB.clear().catch(function () {});
  Store.seed();
  renderCheck(); renderOverview(); renderRecords(); renderStats(); renderSettings();
  toast('已清空');
}
/* ================= 事件绑定 ================= */
function bindEvents() {
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () { switchView(t.dataset.view); });
  });
  $('check-prev').addEventListener('click', function () { state.checkDate = addDays(state.checkDate, -1); renderCheck(); });
  $('check-next').addEventListener('click', function () { state.checkDate = addDays(state.checkDate, 1); renderCheck(); });
  $('ov-prev').addEventListener('click', function () { state.ovDate = addDays(state.ovDate, -1); renderOverview(); });
  $('ov-next').addEventListener('click', function () { state.ovDate = addDays(state.ovDate, 1); renderOverview(); });
  $('rec-prev').addEventListener('click', function () { state.recDate = addDays(state.recDate, -1); renderRecords(); });
  $('rec-next').addEventListener('click', function () { state.recDate = addDays(state.recDate, 1); renderRecords(); });

  $('check-class-list').addEventListener('click', function (e) {
    var card = e.target.closest('.class-card');
    if (card) openScoreSheet(card.dataset.cid);
  });
  $('empty-go-settings').addEventListener('click', function () { switchView('settings'); });

  SCORE_GROUPS.forEach(function (g) {
    $('score-group-' + g.id).addEventListener('input', onScoreInput);
  });
  $('score-note-chips').addEventListener('click', function (e) {
    var chip = e.target.closest('.note-chip');
    if (chip && state.scoreDraft) toggleNoteChip(chip.dataset.nid);
  });
  $('score-note-input').addEventListener('input', function () {
    if (!state.scoreDraft) return;
    state.scoreDraft.note = $('score-note-input').value;
    state.scoreDraft.noteIds = [];
    renderNoteChips();
  });
  $('score-cancel').addEventListener('click', closeScoreSheet);
  $('score-save').addEventListener('click', onScoreSave);
  $('score-mask').addEventListener('click', closeScoreSheet);
  $('score-sheet').addEventListener('change', function (e) {
    var input = e.target.closest('.item-img-input');
    if (input && e.target.files && e.target.files[0]) handleItemImgFile(input.dataset.item, e.target.files[0]);
    if (input) e.target.value = '';
  });
  $('score-sheet').addEventListener('click', function (e) {
    var del = e.target.closest('.img-thumb-del');
    if (del) { delItemImg(del.dataset.item, del.dataset.kind, parseInt(del.dataset.idx, 10)); return; }
    var thumb = e.target.closest('.img-thumb img');
    if (thumb && thumb.src) { $('img-viewer-src').src = thumb.src; $('img-mask').hidden = false; $('img-viewer').hidden = false; }
  });
  $('ov-content').addEventListener('click', function (e) {
    var img = e.target.closest('.ov-img');
    if (img && img.src) { $('img-viewer-src').src = img.src; $('img-mask').hidden = false; $('img-viewer').hidden = false; }
  });
  $('rec-list').addEventListener('click', function (e) {
    var img = e.target.closest('.rec-img');
    if (img && img.src) { $('img-viewer-src').src = img.src; $('img-mask').hidden = false; $('img-viewer').hidden = false; }
  });
  $('img-viewer-close').addEventListener('click', closeImgViewer);
  $('img-mask').addEventListener('click', closeImgViewer);

  $('rec-list').addEventListener('click', function (e) {
    var del = e.target.closest('.rec-del');
    if (del) {
      if (confirm('删除该班当天评分？')) {
        Store.delDayClass(state.recDate, del.dataset.cid);
        renderRecords();
        toast('已删除');
      }
    }
  });
  $('btn-clear-day').addEventListener('click', function () {
    var day = Store.getDay(state.recDate);
    if (!Object.keys(day).length) { toast('当天无数据'); return; }
    if (confirm('删除当天全部评分？')) { Store.clearDay(state.recDate); renderRecords(); toast('已删除'); }
  });

  $('stats-from').addEventListener('change', function () {
    var v = $('stats-from').value;
    if (v) { state.statsFrom = v; state.statsQuick = 'custom'; renderStats(); }
  });
  $('stats-to').addEventListener('change', function () {
    var v = $('stats-to').value;
    if (v) { state.statsTo = v; state.statsQuick = 'custom'; renderStats(); }
  });
  document.querySelectorAll('#stats-quick .seg').forEach(function (b) {
    b.addEventListener('click', function () {
      state.statsQuick = b.dataset.q;
      if (b.dataset.q === 'week') { state.statsFrom = weekStartStr(); state.statsTo = todayStr(); }
      else if (b.dataset.q === 'month') { state.statsFrom = monthStartStr(); state.statsTo = todayStr(); }
      else if (b.dataset.q === 'all') { state.statsFrom = '0000-00-00'; state.statsTo = '9999-12-31'; }
      renderStats();
    });
  });
  document.querySelectorAll('#stats-topn .seg').forEach(function (b) {
    b.addEventListener('click', function () { state.statsTopN = b.dataset.n; renderStats(); });
  });

  $('class-manage-list').addEventListener('click', function (e) {
    var row = e.target.closest('.manage-row');
    if (row) openClassSheet(row.dataset.id);
  });
  $('btn-add-class').addEventListener('click', function () { openClassSheet(null); });
  $('class-cancel').addEventListener('click', closeClassSheet);
  $('class-save').addEventListener('click', onClassSave);
  $('class-delete').addEventListener('click', onClassDelete);
  $('class-mask').addEventListener('click', closeClassSheet);

  $('issue-manage-list').addEventListener('click', function (e) {
    var row = e.target.closest('.manage-row');
    if (row) openIssueSheet(row.dataset.id);
  });
  $('btn-add-issue').addEventListener('click', function () { openIssueSheet(null); });
  $('issue-cancel').addEventListener('click', closeIssueSheet);
  $('issue-save').addEventListener('click', onIssueSave);
  $('issue-delete').addEventListener('click', onIssueDelete);
  $('issue-mask').addEventListener('click', closeIssueSheet);

  $('btn-export').addEventListener('click', exportData);
  $('btn-copy').addEventListener('click', copyData);
  $('btn-import').addEventListener('click', function () { $('import-file').click(); });
  $('import-file').addEventListener('change', function (e) {
    if (e.target.files[0]) importData(e.target.files[0]);
    e.target.value = '';
  });
  $('btn-clear-all').addEventListener('click', clearAllData);
}

function init() {
  Store.seed();
  bindEvents();
  renderCheck();
}
document.addEventListener('DOMContentLoaded', init);