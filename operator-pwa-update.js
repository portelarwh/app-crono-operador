'use strict';

(function(){
  var APP_VERSION = 'v3.0.4';
  var UPDATE_ACK_KEY = 'crono_operador_update_ack_' + APP_VERSION;
  window.APP_VERSION = APP_VERSION;

  function setVersionText(){
    var headerVersion = document.getElementById('appVersion');
    if(headerVersion) headerVersion.textContent = APP_VERSION;

    var splashVersion = document.getElementById('splashVersion');
    if(splashVersion) splashVersion.textContent = APP_VERSION;
  }

  setVersionText();

  var refreshing = false;
  var waitingWorker = null;
  var updateChecked = false;

  function injectStyles(){
    if(document.getElementById('operator-update-styles')) return;
    var style = document.createElement('style');
    style.id = 'operator-update-styles';
    style.textContent = `
      .operator-update-toast{
        position:fixed;
        left:12px;
        right:12px;
        bottom:calc(84px + env(safe-area-inset-bottom, 0px));
        z-index:100000;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:12px 14px;
        border:1px solid rgba(17,139,238,.45);
        border-radius:14px;
        background:rgba(13,17,23,.96);
        color:#ffffff;
        box-shadow:0 12px 32px rgba(0,0,0,.35);
        font-family:inherit;
      }
      .operator-update-toast strong{display:block;font-size:.92rem;margin-bottom:2px;}
      .operator-update-toast span{display:block;font-size:.78rem;color:#aeb8c6;line-height:1.25;}
      .operator-update-toast button{
        border:0;
        border-radius:10px;
        padding:9px 12px;
        background:#118bee;
        color:#fff;
        font-weight:800;
        white-space:nowrap;
        cursor:pointer;
      }
    `;
    document.head.appendChild(style);
  }

  function markUpdateAcknowledged(){
    try { sessionStorage.setItem(UPDATE_ACK_KEY, '1'); } catch(e) {}
  }

  function wasUpdateAcknowledged(){
    try { return sessionStorage.getItem(UPDATE_ACK_KEY) === '1'; } catch(e) { return false; }
  }

  function showUpdateToast(worker){
    if(wasUpdateAcknowledged()) return;

    waitingWorker = worker || waitingWorker;
    if(document.getElementById('operatorUpdateToast')) return;

    injectStyles();

    var toast = document.createElement('div');
    toast.id = 'operatorUpdateToast';
    toast.className = 'operator-update-toast';
    toast.innerHTML = `
      <div>
        <strong>Nova versão disponível</strong>
        <span>Toque em atualizar para carregar a versão mais recente do app.</span>
      </div>
      <button type="button" id="operatorUpdateNow">Atualizar</button>
    `;
    document.body.appendChild(toast);

    var btn = document.getElementById('operatorUpdateNow');
    if(btn){
      btn.addEventListener('click', function(){
        markUpdateAcknowledged();
        btn.disabled = true;
        btn.textContent = 'Atualizando...';
        if(waitingWorker){
          waitingWorker.postMessage({type:'SKIP_WAITING'});
        }else{
          window.location.reload();
        }
      });
    }
  }

  function watch(worker){
    if(!worker) return;
    worker.addEventListener('statechange', function(){
      if(worker.state === 'installed' && navigator.serviceWorker.controller){
        showUpdateToast(worker);
      }
    });
  }

  function register(){
    setVersionText();
    if(!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('controllerchange', function(){
      if(refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    window.addEventListener('load', function(){
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function(reg){
        if(reg.installing) watch(reg.installing);
        reg.addEventListener('updatefound', function(){ watch(reg.installing); });

        /*
          Verifica atualização uma única vez por abertura do app.
          Não mostra toast apenas porque existe reg.waiting antigo; o toast aparece
          somente quando um novo worker instala durante esta sessão.
        */
        if(!updateChecked){
          updateChecked = true;
          reg.update().catch(function(err){ console.warn('[Crono Operador] Verificação de atualização falhou:', err); });
        }
      }).catch(function(err){
        console.warn('[Crono Operador] Service Worker falhou:', err);
      });
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', register);
  }else{
    register();
  }
})();
