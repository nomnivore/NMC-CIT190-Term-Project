
function showNavOnScroll(){
  if($(window).scrollTop() > $(".hero-nav").offset().top){
    $("nav").removeClass("nav-hidden");
  } else {
    $("nav").addClass("nav-hidden");
  }
}

$(function() {
  $(window).on("scroll", showNavOnScroll);

  showNavOnScroll();
})
