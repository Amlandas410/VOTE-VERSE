function startVoting() {
    window.location.href = "https://undegrading-unintervening-annette.ngrok-free.dev/Online%20Voting%20System/Voter%20login%20Form/index.html";
}

// Intersection Observer for scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

// Observe elements when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Observe feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => observer.observe(card));

    // Observe step cards
    const stepCards = document.querySelectorAll('.step-card');
    stepCards.forEach(card => observer.observe(card));

    // Observe CTA card
    const ctaCard = document.querySelector('.cta-card');
    if (ctaCard) observer.observe(ctaCard);

    // Observe section headers
    const sectionHeaders = document.querySelectorAll('.section-header.fade-in-up');
    sectionHeaders.forEach(header => observer.observe(header));
});

// Add smooth scroll behavior
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});