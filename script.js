
(function () {
  const STORAGE_KEY = 'phonebook_contacts_v1';
 

  // DOM elements
  const els = {
    contactForm: document.getElementById('contactForm'),
    contactId: document.getElementById('contactId'),
    name: document.getElementById('name'),
    phone: document.getElementById('phone'),
    email: document.getElementById('email'),
    formTitle: document.getElementById('formTitle'),
    formError: document.getElementById('formError'),
    contactsBody: document.getElementById('contactsBody'),
    contactCount: document.getElementById('contactCount'),
    message: document.getElementById('message'),
    searchInput: document.getElementById('searchInput'),
    clearSearch: document.getElementById('clearSearch'),
    cancelEdit: document.getElementById('cancelEdit'),
    saveBtn: document.getElementById('saveBtn'),
  };

  // fallback initial data (used if fetch fails)
  const initialContacts = [
    { id: "1", name: "Alice Johnson", phone: "+91 98765 43210", email: "alice@example.com" },
    { id: "2", name: "Bob Kumar", phone: "+91 98765 11223", email: "bob@example.net" },
    { id: "3", name: "Carol Singh", phone: "+91 98400 22334", email: "carol@example.org" }
  ];

  let contacts = [];

  function showMessage(text = '', isError = false) {
    els.message.textContent = text;
    els.message.style.color = isError ? 'var(--danger)' : 'var(--accent)';
    els.message.style.display = text ? 'block' : 'none';
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
    } catch (err) {
      console.error('Persist error', err);
      showMessage('Could not save locally. Your changes may be lost.', true);
    }
  }

  function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function renderContacts(filtered = null) {
    const list = filtered ?? contacts;
    els.contactsBody.innerHTML = '';
    if (!list.length) {
      els.contactsBody.innerHTML = `<tr><td class="empty" colspan="4">No contacts found</td></tr>`;
    } else {
      for (const c of list) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(c.name)}</td>
          <td>${escapeHtml(c.phone)}</td>
          <td>${escapeHtml(c.email || '')}</td>
          <td class="contact-actions">
            <button class="edit" data-id="${c.id}">Edit</button>
            <button class="delete" data-id="${c.id}">Delete</button>
          </td>
        `;
        els.contactsBody.appendChild(tr);
      }
    }
    els.contactCount.textContent = `Contacts: ${contacts.length}`;
  }

  function resetForm() {
    els.contactId.value = '';
    els.name.value = '';
    els.phone.value = '';
    els.email.value = '';
    els.formTitle.textContent = 'Add Contact';
    els.formError.textContent = '';
    if (els.saveBtn) els.saveBtn.textContent = 'Save';
  }

  function validateContact({ name, phone }) {
    if (!name || name.trim().length < 2) return 'Name should be at least 2 characters.';
    if (!phone || !/^\+?\d[\d\s-]{4,}$/.test(phone)) return 'Phone number appears invalid.';
    return null;
  }

  function findContactById(id) {
    return contacts.find(c => c.id === id);
  }

  async function addContact(contact) {
    try {
      contact.id = Date.now().toString();
      contacts.unshift(contact);
      persist();
      renderContacts();
      showMessage('Contact added.');
    } catch (err) {
      showMessage('Add failed: ' + err.message, true);
    }
  }

  async function updateContact(id, updates) {
    try {
      const idx = contacts.findIndex(c => c.id === id);
      if (idx === -1) throw new Error('Contact not found');
      contacts[idx] = { ...contacts[idx], ...updates };
      persist();
      renderContacts();
      showMessage('Contact updated.');
    } catch (err) {
      showMessage('Update failed: ' + err.message, true);
    }
  }

  async function deleteContact(id) {
    try {
      const confirmDelete = confirm('Delete this contact?');
      if (!confirmDelete) return;
      contacts = contacts.filter(c => c.id !== id);
      persist();
      renderContacts();
      showMessage('Contact deleted.');
    } catch (err) {
      showMessage('Delete failed: ' + err.message, true);
    }
  }

  function applySearch(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      renderContacts();
      return;
    }
    const filtered = contacts.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    );
    renderContacts(filtered);
  }

  // attempt to load contacts: prefer localStorage, else try fetch, else fallback array
  async function loadContacts() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        contacts = JSON.parse(stored);
        return;
      }

   
      try {
        const resp = await fetch(DATA_URL);
        if (resp.ok) {
          const data = await resp.json();
          contacts = Array.isArray(data) ? data : initialContacts.slice();
          persist();
          return;
        } else {
          // fallback
          contacts = initialContacts.slice();
        }
      } catch (err) {
       
        contacts = initialContacts.slice();
      }
    } catch (err) {
      console.error('Load contacts error:', err);
      contacts = initialContacts.slice();
    }
  }

  document.addEventListener('DOMContentLoaded', async function () {
    showMessage('Loading contacts...');
    await loadContacts();
    renderContacts();
    showMessage('');

    // Form submit
    if (els.contactForm) {
      els.contactForm.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const id = els.contactId.value;
        const contact = {
          name: els.name.value.trim(),
          phone: els.phone.value.trim(),
          email: els.email.value.trim() || ''
        };
        const v = validateContact(contact);
        if (v) {
          els.formError.textContent = v;
          return;
        }
        els.formError.textContent = '';
        if (id) {
          await updateContact(id, contact);
        } else {
          await addContact(contact);
        }
        resetForm();
      });
    }

    // Table actions
    els.contactsBody.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button');
      if (!btn) return;
      const id = btn.dataset.id;
      if (btn.classList.contains('edit')) {
        const c = findContactById(id);
        if (!c) { showMessage('Contact not found', true); return; }
        els.contactId.value = c.id;
        els.name.value = c.name;
        els.phone.value = c.phone;
        els.email.value = c.email || '';
        els.formTitle.textContent = 'Edit Contact';
        if (els.saveBtn) els.saveBtn.textContent = 'Update';
      } else if (btn.classList.contains('delete')) {
        deleteContact(id);
      }
    });

    // Search
    els.searchInput.addEventListener('input', (ev) => {
      applySearch(ev.target.value);
    });
    els.clearSearch.addEventListener('click', () => {
      els.searchInput.value = '';
      applySearch('');
    });
    els.cancelEdit.addEventListener('click', (ev) => {
      resetForm();
    });
  });
})();
