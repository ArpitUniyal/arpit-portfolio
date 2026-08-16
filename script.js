const dot = document.querySelector('.cursor-dot');
const ring = document.querySelector('.cursor-ring');
let mouseX = -100, mouseY = -100, ringX = -100, ringY = -100;

window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; dot.style.left = mouseX + 'px'; dot.style.top = mouseY + 'px'; });
function animateCursor(){ ringX += (mouseX-ringX)*.14; ringY += (mouseY-ringY)*.14; ring.style.left=ringX+'px'; ring.style.top=ringY+'px'; requestAnimationFrame(animateCursor); } animateCursor();
document.querySelectorAll('a, .capability').forEach(el=>{el.addEventListener('mouseenter',()=>ring.classList.add('hover'));el.addEventListener('mouseleave',()=>ring.classList.remove('hover'));});

const observer = new IntersectionObserver(entries => entries.forEach(entry => {if(entry.isIntersecting){entry.target.classList.add('show');observer.unobserve(entry.target)}}),{threshold:.14});
document.querySelectorAll('.reveal, .reveal-line').forEach((el,i)=>{el.style.transitionDelay=(i%4)*70+'ms';observer.observe(el)});

document.querySelectorAll('.magnetic').forEach(el=>{el.addEventListener('mousemove',e=>{const r=el.getBoundingClientRect(), x=(e.clientX-r.left-r.width/2)*.16, y=(e.clientY-r.top-r.height/2)*.16;el.style.transform=`translate(${x}px,${y}px)`});el.addEventListener('mouseleave',()=>el.style.transform='translate(0,0)')});

const filters = document.querySelectorAll('.filter');
const projects = document.querySelectorAll('.project');
filters.forEach(filter => filter.addEventListener('click', () => {
  const type = filter.textContent.trim().toLowerCase().replace('all work', 'all');
  filters.forEach(item => item.classList.remove('active'));
  filter.classList.add('active');
  projects.forEach(project => project.classList.toggle('is-filtered', type !== 'all' && !project.dataset.type.includes(type)));
}));

document.querySelectorAll('.project-carousel').forEach(carousel => {
  const slides = [...carousel.querySelectorAll('.slide')];
  const dots = carousel.querySelector('.carousel-dots');
  const counter = carousel.querySelector('.image-counter');
  let active = 0;
  const showSlide = index => {
    active = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('active', i === active));
    [...dots.children].forEach((dot, i) => dot.classList.toggle('active', i === active));
    counter.textContent = `${String(active + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
  };
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button'; dot.setAttribute('aria-label', `Show screenshot ${i + 1}`);
    dot.addEventListener('click', () => showSlide(i));
    dots.append(dot);
  });
  carousel.querySelector('.carousel-next').addEventListener('click', () => showSlide(active + 1));
  showSlide(0);
});
