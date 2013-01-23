/**
 *
 * Author: Daniel Albrecht
 *
 */

MBP.scaleFix();
MBP.hideUrlBarOnLoad();
MBP.preventZoom();
MBP.startupImage();



$(document).ready(function(){
	$('#cardeck').cards();
/*
    $.shake({
        callback: function() {
            $('#cardeck').cards();
        }
    });


    $('#info').pep({
        axis: 'y',
        activeClass: 'active', 
        multiplier: 2.3,
        shouldEase:false,
        drag: function(ev, obj){ 
            var t = $('#info');
            var w = $(window).height();
            var o = t.position();
            if( (w-200) <= o.top) t.css({ 'top': (w-200)+'px' });
            else if( (-200) >= o.top) t.css({ 'top': '-200px' });
        }
    });
*/
});



/**
 * var testArray = [1,2,3,4,5];
 * Shuffle(testArray);
 */
 function Shuffle(o) {
 	for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
 		return o;
 };


// Place any jQuery/helper plugins in here.
$.fn.cards = function(opt){

	opt = $.extend({
		hintergrund: "#000000"
	}, opt);


	var t = $(this);
	var cardsArray = new Array(7,8,9,10,'B','D','K','A');
	var set = new Array();
	var deckReturn = new Array();

	// Karten zufällig anordnen
	function shuffleCards(){
		for (var c = 3; c >= 0; c--) {
			for (var i = cardsArray.length - 1; i >= 0; i--) {
				displayCards(c, cardsArray[i]);
			};
			var randSet = new Array();
			randSet.push( Shuffle(cardsArray) );
			set.push( randSet[0] );
		};
	}

	function displayCards(a, b){
		var cla = 'card_'+a+'_'+b;
		deckReturn.push('<div class="card ' + cla + '"><span></span><span class="main">'+b+'</span><span></span></div>');
	}

	function showCards(){
		var randomeArray = new Array(Shuffle(deckReturn));
		for (var i = randomeArray.length - 1; i >= 0; i--) {
			t.append(randomeArray[i]);
		};
	}

	function nextCard(tc){
		tc.transition({
            opacity: 0,
            scale: 1.1,
            left: 900
        }, 400);
        setTimeout(function(){
	        tc.remove();
	        init();
        }, 200);
	}


    function checkPosition(tc){
        //var tc = $('div.card:first-child');
        var p = tc.position();
        if(p.left >= 200){
            nextCard(tc);
        }else{
            tc.transition({ left:15 }, 200);
            return false;
        }
    }


    function init(){
        if ($('div.card').length) {
            //$('div.card:first-child').transition({rotateY: '180deg'}, 200);
            $('div.card:first-child').pep({ 
                axis: 'x',
                useCSSTranslation: true,
                stop: function(ev, obj){
                    checkPosition( obj.$el ); 
                }
            });
        }
    }

	shuffleCards();
	showCards();
	t.randomElenent();
    init();
}



/*

 * Random element function

 */
$.fn.randomElenent = function(){
	$(this).each(function(){
        var $ul = $(this);
        var $liArr = $ul.children('div:not(.last)');

        $liArr.sort(function(a,b){
            var temp = parseInt( Math.random()*10 );
            var isOddOrEven = temp%2;
            var isPosOrNeg = temp>5 ? 1 : -1;
            return( isOddOrEven*isPosOrNeg );
        })
        .prependTo($ul);            
    });

}


