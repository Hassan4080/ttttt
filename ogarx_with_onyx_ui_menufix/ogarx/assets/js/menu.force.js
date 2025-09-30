(function(){
  document.addEventListener('DOMContentLoaded', function(){
    try {
      ['lastMode','autoPlay','autoplay','continue','resume','spectate','playState'].forEach(k=>localStorage.removeItem(k));
    } catch(e){}
    var menu = document.getElementById('menu-display-center');
    if (menu) {
      menu.style.display = 'flex';
      menu.style.opacity = '1';
      menu.style.visibility = 'visible';
      menu.classList.add('showing');
    }
    // If URL has ?spectate or ?play, strip it so app doesn't auto-enter
    try {
      var url = new URL(window.location.href);
      if (url.searchParams.has('spectate') || url.searchParams.has('play')) {
        url.searchParams.delete('spectate');
        url.searchParams.delete('play');
        history.replaceState({}, '', url.toString());
      }
    } catch(e){}
  });
})();