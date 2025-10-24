document.addEventListener('DOMContentLoaded', function () {
    const navbar = document.querySelector('.navbar');

    function checkScroll() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            if (window.innerWidth < 992) {
                e.preventDefault();
                e.stopPropagation();
                
                const parent = this.parentElement;
                const submenu = parent.querySelector('.dropdown-menu');
                
                // Close other open menus
                document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                    if (menu !== submenu) {
                        menu.classList.remove('show');
                    }
                });
                
                submenu.classList.toggle('show');
            }
        });
    });
    // Initial check
    checkScroll();

    // Add scroll event listener
    window.addEventListener('scroll', checkScroll);
});
