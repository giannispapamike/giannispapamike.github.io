// Preloader
function preloader() {
    setTimeout(showPage, 1500);
};

function showPage() {
  document.getElementById("preloader").style.display = "none";
  document.getElementById("main-body").style.display = "block";
}

window.addEventListener('load', preloader, false);

// Toggle Sidenav
function toggleNav() {
    var btn = document.getElementById("hamburgerIcon");
    var sidenav = document.getElementById("sidenav");
    btn.classList.toggle("is-active");
    sidenav.classList.toggle("sidenav-open");
}

// Resize Navbar on Scroll
var x = 0;
$(document).ready(function () {
    $(window).scroll(function () {
        navbar = document.getElementById("navbar");
        if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) {
            if (!navbar.classList.value.includes("resize")) {
                navbar.classList.toggle("resize");
            }
        } else {
            if (navbar.classList.value.includes("resize")) {
                navbar.classList.toggle("resize");
            }
        }
    });
});

/* Write/Delete subtitles Start */
var TxtType = function (el, toRotate, period) {
    this.toRotate = toRotate;
    this.el = el;
    this.loopNum = 0;
    this.period = parseInt(period, 10) || 2000;
    this.txt = '';
    this.tick();
    this.isDeleting = false;
};

TxtType.prototype.tick = function () {
    var i = this.loopNum % this.toRotate.length;
    var fullTxt = this.toRotate[i];

    if (this.isDeleting) {
        this.txt = fullTxt.substring(0, this.txt.length - 1);
    } else {
        this.txt = fullTxt.substring(0, this.txt.length + 1);
    }

    this.el.innerHTML = '<span class="wrap">' + this.txt + '</span>';

    var that = this;
    var delta = 200 - Math.random() * 100;

    if (this.isDeleting) { delta /= 2; }

    if (!this.isDeleting && this.txt === fullTxt) {
        delta = this.period;
        this.isDeleting = true;
    } else if (this.isDeleting && this.txt === '') {
        this.isDeleting = false;
        this.loopNum++;
        delta = 500;
    }

    setTimeout(function () {
        that.tick();
    }, delta);
};


window.onload = function () {
    var elements = document.getElementsByClassName('subtitle');
    for (var i = 0; i < elements.length; i++) {
        var toRotate = elements[i].getAttribute('data-type');
        var period = elements[i].getAttribute('data-period');
        if (toRotate) {
            new TxtType(elements[i], JSON.parse(toRotate), period);
        }
    }
};

/* Write/Delete subtitles End */

// Process Bars load
$(document).ready(function () {
    $(window).scroll(function () {
        var flag = true;
        var distance = document.querySelector("#skills .title").getBoundingClientRect().top;
        if (distance <= document.documentElement.clientHeight - 100) {
            
            var percentages_elem = document.getElementsByClassName("percentage");
            var percentages = [80, 70, 90, 90, 80, 50, 70, 80, 80, 60, 70, 80, 80, 90, 60, 70];
            var bars = document.getElementsByClassName("skill-level");

            Array.prototype.forEach.call(bars, function (elem, i) {

                var percentage = percentages[i];
                var percentage_elem = percentages_elem[i];
                var width = elem.style.width;
                if (width == 0) {
                    var id = setInterval(frame, 20);
                    function frame() {
                        if (width >= percentage) {
                            clearInterval(id);
                        } else {
                            width++;
                            elem.style.width = width + '%';
                            percentage_elem.innerHTML = width + '%';
                        }
                    }
                }
            });
        }
    });
});