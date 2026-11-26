/* 마케팅지니 작업 노트 공통 동작 (2026-11-26)
   점검표(.check) 항목을 누르면 노란 형광펜이 그어지고 네모 칸에 체크 표시 — 다시 누르면 지워짐.
   누른 내용은 저장하지 않습니다(새로고침하면 처음으로). */
(function () {
  var lists = document.querySelectorAll('.check');
  if (!lists.length) return;
  document.documentElement.classList.add('js-on');
  Array.prototype.forEach.call(lists, function (list) {
    var items = list.querySelectorAll('li');
    var count = document.createElement('p');
    count.className = 'check-count';
    count.setAttribute('aria-live', 'polite');
    function update() {
      var on = list.querySelectorAll('li.is-on').length;
      count.textContent = '체크한 항목 ' + on + ' / ' + items.length;
    }
    Array.prototype.forEach.call(items, function (li) {
      var t = document.createElement('span');
      t.className = 'ck-t';
      while (li.firstChild) t.appendChild(li.firstChild);
      li.appendChild(t);
      li.setAttribute('role', 'checkbox');
      li.setAttribute('aria-checked', 'false');
      li.tabIndex = 0;
      function toggle() {
        var on = li.classList.toggle('is-on');
        li.setAttribute('aria-checked', on ? 'true' : 'false');
        update();
      }
      li.addEventListener('click', toggle);
      li.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
      });
    });
    list.parentNode.insertBefore(count, list.nextSibling);
    update();
  });
})();
