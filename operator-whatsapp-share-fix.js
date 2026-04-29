'use strict';

(function(){
  function $(id){ return document.getElementById(id); }

  function textOf(id, fallback){
    var el = $(id);
    return (el && (el.textContent || el.value) || fallback || '').trim();
  }

  function clean(text){
    return String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
  }

  function slug(text){
    return clean(text || 'crono-operador')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'crono-operador';
  }

  function stamp(){
    var d = new Date();
    var p = function(n){ return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth()+1) + '-' + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes());
  }

  function fileName(){
    var equip = ($('equipName') && $('equipName').value) || ($('operationName') && $('operationName').value) || document.title || 'crono-operador';
    return 'crono-operador_' + slug(equip) + '_' + stamp() + '.png';
  }

  function downloadBlob(blob, name){
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }

  function canvasToBlob(canvas){
    return new Promise(function(resolve, reject){
      canvas.toBlob(function(blob){
        blob ? resolve(blob) : reject(new Error('Falha ao gerar imagem.'));
      }, 'image/png', 0.95);
    });
  }

  function buildSummaryText(){
    var equip = clean(($('equipName') && $('equipName').value) || ($('operationName') && $('operationName').value) || '-');
    var analyst = clean(($('analystName') && $('analystName').value) || '-');
    var total = textOf('totalTimer', textOf('liveTimer', '-'));
    var samples = textOf('valSamples', textOf('totalElements', '-'));
    var cycle = textOf('valTotalCycle', textOf('valAvgCycle', '-'));
    var va = textOf('valVA', textOf('valValueAdded', '-'));
    var nva = textOf('valNVA', textOf('valNonValueAdded', '-'));
    var bnva = textOf('valBNVA', textOf('valBusinessNonValueAdded', '-'));

    return 'Resumo Executivo — Cronoanálise Homem-Máquina\n\n'
      + 'Equipamento/Operação: ' + (equip || '-') + '\n'
      + 'Analista: ' + (analyst || '-') + '\n'
      + 'Amostras/Elementos: ' + (samples || '-') + '\n'
      + 'Tempo total: ' + (total || '-') + '\n'
      + 'Ciclo/Referência: ' + (cycle || '-') + '\n'
      + 'VA: ' + (va || '-') + '\n'
      + 'NVA: ' + (nva || '-') + '\n'
      + 'BNVA: ' + (bnva || '-') + '\n\n'
      + 'Imagem do relatório em anexo.';
  }

  async function buildPNGBlob(){
    if(typeof window.html2canvas !== 'function'){
      throw new Error('Biblioteca html2canvas não carregada.');
    }

    if(typeof window.preparePrint === 'function'){
      try{ window.preparePrint(); }catch(e){}
    }
    if(typeof window.renderPrint === 'function'){
      try{ window.renderPrint(); }catch(e){}
    }
    if(typeof window.updatePrintFields === 'function'){
      try{ window.updatePrintFields(); }catch(e){}
    }

    var target = $('exportContainer') || document.body;

    var canvas = await window.html2canvas(target, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      onclone: function(doc){
        doc.documentElement.removeAttribute('data-theme');
        doc.body.classList.add('export-mode');
        var fixed = doc.querySelector('.fixed-bottom');
        if(fixed) fixed.style.display = 'none';
      }
    });

    return canvasToBlob(canvas);
  }

  async function shareWhatsApp(){
    var btn = findWhatsAppButton();
    var oldText = btn ? btn.textContent : '';

    if(btn){
      btn.disabled = true;
      btn.textContent = '⏳ Gerando...';
    }

    try{
      var text = buildSummaryText();
      var blob = await buildPNGBlob();
      var name = fileName();
      var file = new File([blob], name, { type: 'image/png' });

      if(navigator.share && navigator.canShare && navigator.canShare({ files: [file] })){
        await navigator.share({
          files: [file],
          title: 'Cronoanálise Homem-Máquina',
          text: text
        });
      }else{
        downloadBlob(blob, name);
        window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer');
      }
    }catch(e){
      if(e && e.name === 'AbortError') return;
      console.error('[Crono Operador] Erro WhatsApp:', e);
      alert((e && e.message) || 'Erro ao gerar compartilhamento para WhatsApp.');
    }finally{
      if(btn){
        btn.textContent = oldText;
        btn.disabled = false;
      }
    }
  }

  function isWhatsAppButton(el){
    if(!el || el.tagName !== 'BUTTON') return false;
    var txt = clean(el.textContent).toLowerCase();
    var id = String(el.id || '').toLowerCase();
    var action = String(el.dataset && el.dataset.action || '').toLowerCase();
    var cls = String(el.className || '').toLowerCase();
    return txt.indexOf('whatsapp') >= 0 || id.indexOf('whatsapp') >= 0 || action.indexOf('whatsapp') >= 0 || cls.indexOf('whatsapp') >= 0 || txt.indexOf('💬') >= 0;
  }

  function findWhatsAppButton(){
    var buttons = Array.prototype.slice.call(document.querySelectorAll('button'));
    return buttons.find(isWhatsAppButton) || null;
  }

  function bind(){
    var buttons = Array.prototype.slice.call(document.querySelectorAll('button')).filter(isWhatsAppButton);
    buttons.forEach(function(button){
      if(button.dataset.operatorWhatsappBound === 'true') return;
      button.dataset.operatorWhatsappBound = 'true';
      button.addEventListener('click', function(event){
        if(button.disabled) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        shareWhatsApp();
      }, true);
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bind);
  }else{
    bind();
  }

  window.addEventListener('load', bind);
  window.buildCronoOperadorPNGBlob = buildPNGBlob;
})();
