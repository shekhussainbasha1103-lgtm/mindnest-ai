const $ = (s) => document.querySelector(s);
const messagesEl = $('#messages');
const chatScroll = $('#chatScroll');
const input = $('#messageInput');
const fileInput = $('#fileInput');
const sendBtn = $('#sendBtn');
let selectedFile = null;
let mode = 'chat';
let busy = false;

const modeNames = { chat: 'Ask anything', notes: 'College notes', explain: 'Explain a topic', quiz: 'Practice quiz' };

function toast(message) {
  const el = $('#toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 3200);
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
// Small safe Markdown renderer: HTML is escaped before formatting.
function renderMarkdown(text) {
  let s = escapeHtml(text).replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
  s = s.replace(/^### (.*)$/gm, '<h3>$1</h3>').replace(/^## (.*)$/gm, '<h2>$1</h2>').replace(/^# (.*)$/gm, '<h1>$1</h1>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>');
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  s = s.replace(/^(?:- |\* )(.*)$/gm, '<li>$1</li>').replace(/(<li>[\s\S]*?<\/li>)(?:\n<li>[\s\S]*?<\/li>)*/g, m => `<ul>${m}</ul>`);
  s = s.replace(/^(\d+)\. (.*)$/gm, '<li>$2</li>');
  // Split into paragraphs without wrapping block elements.
  return s.split(/\n{2,}/).map(part => {
    const t = part.trim(); if (!t) return '';
    if (/^(<h[1-3]>|<ul>|<ol>|<pre>|<blockquote>|<li>)/.test(t)) return t;
    return `<p>${t.replace(/\n/g, '<br>')}</p>`;
  }).join('');
}
function addMessage(role, text, fileName) {
  const wrap = document.createElement('article'); wrap.className = `message ${role}`;
  const avatar = document.createElement('div'); avatar.className = 'avatar'; avatar.textContent = role === 'assistant' ? '✦' : 'Y';
  const bubble = document.createElement('div'); bubble.className = 'bubble';
  if (role === 'assistant') bubble.innerHTML = renderMarkdown(text); else {
    bubble.textContent = text || '';
    if (fileName) { const f = document.createElement('p'); f.style.cssText = 'font-size:11px;color:#a9b8e4;margin-top:8px'; f.textContent = '📎 ' + fileName; bubble.appendChild(f); }
  }
  wrap.append(avatar, bubble); messagesEl.appendChild(wrap); $('#welcome').hidden = true; scrollBottom(); return wrap;
}
function scrollBottom() { chatScroll.scrollTop = chatScroll.scrollHeight; }
function setMode(next) {
  mode = next in modeNames ? next : 'chat';
  document.querySelectorAll('.tool-link').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  $('#modeLabel').textContent = modeNames[mode];
  const placeholders = {chat:'Ask a question, explore an idea…',notes:'Which subject or topic should your college notes cover?',explain:'What topic would you like explained step by step?',quiz:'Which subject or topic should I quiz you on?'};
  input.placeholder = placeholders[mode];
  $('#sidebar').classList.remove('open');
}
function resetChat() { messagesEl.innerHTML = ''; $('#welcome').hidden = false; setMode('chat'); input.value = ''; selectedFile = null; $('#filePreview').hidden = true; fileInput.value = ''; input.focus(); }
function autoResize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 180) + 'px'; }
async function sendMessage(prefill) {
  if (busy) return;
  const message = (typeof prefill === 'string' ? prefill : input.value).trim();
  if (!message && !selectedFile) { input.focus(); return; }
  const file = selectedFile;
  addMessage('user', message || 'Please analyze this file.', file?.name);
  input.value = ''; autoResize(); selectedFile = null; $('#filePreview').hidden = true; fileInput.value = '';
  const typing = document.createElement('article'); typing.className = 'message assistant'; typing.innerHTML = '<div class="avatar">✦</div><div class="bubble"><div class="typing"><i></i><i></i><i></i></div></div>'; messagesEl.appendChild(typing); scrollBottom();
  busy = true; sendBtn.disabled = true;
  try {
    const form = new FormData(); form.append('message', message); form.append('mode', mode); if (file) form.append('file', file);
    const response = await fetch('/api/chat', { method: 'POST', body: form });
    const data = await response.json().catch(() => ({}));
    typing.remove();
    if (!response.ok) { addMessage('assistant', `**I couldn't complete that request.**\n\n${data.error || 'Please try again.'}`); return; }
    addMessage('assistant', data.answer || 'I could not create an answer this time. Please try again.');
  } catch (_err) { typing.remove(); addMessage('assistant', '**Connection problem.**\n\nPlease check your internet connection and try again.'); }
  finally { busy = false; sendBtn.disabled = false; input.focus(); }
}

$('#sendBtn').addEventListener('click', () => sendMessage());
input.addEventListener('input', autoResize);
input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
$('#newChat').addEventListener('click', resetChat);
$('#attachBtn').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0]; if (!file) return;
  if (file.size > 10 * 1024 * 1024) { toast('Please choose a file smaller than 10 MB.'); fileInput.value = ''; return; }
  selectedFile = file; $('#fileName').textContent = file.name; $('#filePreview').hidden = false;
});
$('#removeFile').addEventListener('click', () => { selectedFile = null; fileInput.value = ''; $('#filePreview').hidden = true; });
document.querySelectorAll('.tool-link').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
document.querySelectorAll('.prompt-card').forEach(b => b.addEventListener('click', () => { if (b.dataset.mode) setMode(b.dataset.mode); input.value = b.dataset.prompt || ''; autoResize(); input.focus(); if (input.value.length > 90) input.setSelectionRange(input.value.length, input.value.length); }));
$('#mobileMenu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
document.addEventListener('click', e => { if (window.innerWidth <= 760 && $('#sidebar').classList.contains('open') && !$('#sidebar').contains(e.target) && !$('#mobileMenu').contains(e.target)) $('#sidebar').classList.remove('open'); });
fetch('/api/health').then(r => r.json()).then(data => { $('#apiStatus').textContent = data.configured ? 'AI connection ready' : 'Add your API key to start'; if (!data.configured) { document.querySelector('.status-dot').style.background = '#f4c36a'; document.querySelector('.top-pill .status-dot').style.background = '#f4c36a'; } }).catch(() => { $('#apiStatus').textContent = 'Connection status unavailable'; });
