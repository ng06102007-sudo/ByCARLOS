const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() { navigation.classList.remove('open'); menuButton.setAttribute('aria-expanded', 'false'); }
menuButton.addEventListener('click', () => { const isOpen = navigation.classList.toggle('open'); menuButton.setAttribute('aria-expanded', String(isOpen)); });
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && navigation.classList.contains('open')) { closeMenu(); menuButton.focus(); } });
document.addEventListener('click', event => { if (!event.target.closest('.header')) closeMenu(); });
const contact = window.MALNEO_CONTACT || {};
const contactLinks = document.querySelector('#contact-links');
if (contactLinks) {
contactLinks.replaceChildren();
function addContact(label, value, href) {
  const row = document.createElement('div'); row.className = 'contact-row';
  const title = document.createElement('span'); title.textContent = label;
  const strong = document.createElement('strong'); const link = document.createElement('a');
  link.textContent = value; link.href = href; strong.append(link); row.append(title, strong); contactLinks.append(row);
}
const phone = (contact.telephoneLien || '').replace(/[\s().-]/g, '');
if (contact.telephone && /^\+?[0-9]{6,15}$/.test(phone)) addContact('APPELEZ-NOUS', contact.telephone, 'tel:' + phone);
if (contact.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) addContact('ÉCRIVEZ-NOUS', contact.email, 'mailto:' + contact.email);
const callButton = document.querySelector('.call-button');
if (callButton && /^\+?[0-9]{6,15}$/.test(phone)) callButton.href = 'tel:' + phone;

}
