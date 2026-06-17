document.getElementById('backBtn').addEventListener('click', () => {
  window.close();
});

const notifyBtn = document.getElementById('notifyBtn');
const emailInput = document.getElementById('emailInput');
const notifyStatus = document.getElementById('notifyStatus');

notifyBtn.addEventListener('click', () => {
  const email = emailInput.value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    emailInput.style.borderColor = '#f87171';
    setTimeout(() => { emailInput.style.borderColor = ''; }, 1500);
    return;
  }

  chrome.storage.local.get('notifyEmails', (data) => {
    const emails = data.notifyEmails || [];
    if (!emails.includes(email)) emails.push(email);
    chrome.storage.local.set({ notifyEmails: emails });
  });

  notifyBtn.disabled = true;
  emailInput.disabled = true;
  notifyStatus.classList.remove('hidden');
  notifyBtn.textContent = '✓ Done';
});
