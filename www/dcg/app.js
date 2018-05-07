// pengine + solution counter
var pengine;
var nthSolution = 1;
// visualisation zoom+panning position
var scale = 1;
var posX = 120;
var posY = 140;
// replaced variable names
var varnames = {
	count: 0
};
// codemirror
var src;
var focusLine = 0;


// Query Prolog
function query(event) {
	// disable result button (reactivated in success handler)
	$('#run').prop('disabled', true);
	$('#next').prop('disabled', true);

	// TODO validate inputs .. (currently handled solely by pengines)
	var dcg_body = $('#dcgrule').val();
	var list_in = $('#list_in').val();
	var list_rest = $('#list_out').val();

	var query = 'phrase_mi_nth(' + dcg_body + ', ' + list_in + ', ' + list_rest + ', ' + nthSolution + ', Dict)';

	pengine = new Pengine({
		onsuccess: handleSuccess,
		onfailure: handleFailure,
		onerror: handleError,
		src: src.getValue(),
		destroy: true,
		ask: query
	});

	return false;
}

// Handle result from Pengines
function handleSuccess() {
	// fetch dict
	var dict = this.data[0].Dict;

	// only for debugging
	//console.log(this);

	// reset varname counter
	resetVarnames();

	var goal = $('#goalTemplate').html();
	var choice = $('#choiceTemplate').html();
	var query = $('#queryTemplate').html();

	var templateGoal = Handlebars.compile(goal);
	var templateChoice = Handlebars.registerPartial('choice', choice);
	var templateChoice = Handlebars.registerPartial('goal', goal);
	var templateQuery = Handlebars.compile(query);

	$('#visualisation').html(templateGoal(dict));

	var goal = dict.events[dict.events.length - 1].goal;
	$('#result').html(templateQuery(dict.events[dict.events.length - 1]) + '<strong>Input:</strong> ' + replaceVars(goal[0][goal[0].length - 2]) + ' &nbsp;&nbsp; ' + '<strong>Rest:</strong> ' + replaceVars(goal[goal.length - 1][goal[goal.length - 1].length - 1]));

	// visualisation
	initSlider(dict.events[dict.events.length - 1].step);
	updateVisualisation();
	enableVisualisation();
	hoverEvents();

	if (this.more) {
		pengine.stop();
		nthSolution++;
		$('#run').prop('disabled', true);
		$('#next').prop('disabled', false);
	} else {
		$('#run').prop('disabled', true);
		$('#next').prop('disabled', true);
	}
}

function handleFailure() {
	alert('No more solutions.');
	$('#run').prop('disabled', true);
	$('#next').prop('disabled', true);
}

function handleError() {
	alert('Error:\n' + this.data);
	$('#run').prop('disabled', true);
	$('#next').prop('disabled', true);
}
	
// reset counter & button ()
function reset() {
	nthSolution = 1;
	$('#run').prop('disabled', false);
	$('#next').prop('disabled', true);
	removeHighlight(focusLine);
	disableVisualisation();
}

// Enable and disable the visualisation (on start / after changing inputs prior to finding a solution)
function disableVisualisation() {
	$('#steps button, #steps input').attr('disabled', 'disabled');
	$('#toggleLists').attr('disabled', 'disabled');
	$('#zoom button').attr('disabled', 'disabled');
	$('#visualisationPanel, #visualisation, #resultPanel').addClass('disabled');
	$('ul.goal li').off();
}

function enableVisualisation() {
	if (nthSolution == 1) {
		posX = 120;
		posY = 140;
		$('#visualisation').css('left', posX);
		$('#visualisation').css('top', posY);
	}
	$('#steps button, #steps input').removeAttr('disabled');
	$('#toggleLists').removeAttr('disabled');
	$('#zoom button').removeAttr('disabled');
	$('#visualisationPanel, #visualisation, #resultPanel').removeClass('disabled');
}

// replace variable names + format goal
Handlebars.registerHelper('goals', function(goalList) {
	var goalString = '';
	// goal is list of goals 
	var nGoals = goalList.length - 1;
	goalList.forEach(function(goal, i) {
		// for each individual goal ( =.. Goal)

		// Number of Args of goal
		var nArgs = goal.length - 1;

		// terminal
		if (goal[0] == "'T'") {
			goalString += replaceVars(goal[1]);
			return false;
		}

		// prolog
		if (goal[0] == "'P'") {
			goalString += '{' + replaceVars(goal[1]) + '}';
			return false;
		}

		//non-terminal
		// first element: non-terminal indicator
		goalString += goal[0];
		// has additional Args?
		if (nArgs > 2) {
			goalString += '(';

			for (var j = 1; j <= nArgs - 3; j++) {
				goalString += replaceVars(goal[j]) + ', ';
			}
			goalString += replaceVars(goal[nArgs - 2]);
			goalString += '<span>, ';
			goalString += replaceVars(goal[nArgs - 1]) + ', ' + replaceVars(goal[nArgs]);
			goalString += '</span>)';
		} else {
			goalString += '<span>(' + replaceVars(goal[1]) + ', ' + replaceVars(goal[2]) + ')</span>';
		}

		// comma seperated, if multiple goals (toplevel)
		if (nGoals != i)
			goalString += ', ';
	})

	return goalString;
});

// replace varnames in strings
function replaceVars(goal) {
	return goal.replace(/(_[0-9]+)/gi, function replace(x) {
		return varname(x);
	});
}

// get variable name for given var
function varname(variable) {
	// if new -> create new varname
	if (varnames[variable] == null) {
		varnames[variable] = createVarname(varnames['count']);
		varnames['count']++;
	}
	return varnames[variable];
}
// new result -> reset Varnames
function resetVarnames() {
	varnames = {
		count: 0
	};
}

// create varnames: int to A,B, .. AA, AB
function createVarname(count) {
	var result = '';
	while (count >= 0) {
		result = String.fromCharCode(65 + count % 26) + result;
		count = Math.floor(count / 26);
		count--;
	}
	return result;
}

/**
	Step-By-Step
*/
function initSlider(max) {
	$('#rangeslider').attr('max', max);
	document.getElementById('rangeslider').value = max;
	//$('#rangeslider').attr('value', max);
	$('#rangevalue').text(max);
	$('#rangemax').text(max);
}

// handle next/prev button events
function makeStep(e) {
	var id = e.target.id;
	var maxStep = parseInt($('#rangeslider').attr('max'));
	var currentStep = parseInt(document.getElementById('rangeslider').value);
	var nextStep = currentStep;

	if (id == 'button-back') {
		nextStep = previousResult();
	} else if (id == 'button-back-step' && currentStep > 1) {
		nextStep--;
	} else if (id == 'button-forward-step' && currentStep < maxStep) {
		nextStep++;
	} else if (id == 'button-forward') {
		nextStep = nextResult();
	}
	document.getElementById('rangeslider').value = nextStep;
	updateVisualisation();
}

// go to next Solution (toplevel)
function nextResult() {
	var focusStep = parseInt(document.getElementById('rangeslider').value);
	var maxStep = parseInt($('#rangeslider').attr('max'));
	var nextStep;

	$('#visualisation > ul.goal > li').each(function() {
		var step = parseInt($(this).attr('id').replace('step-', ''));

		if ((focusStep < step && step != 2) || step == maxStep) {
			nextStep = step;
			// break loop
			return false;
		}
	});

	return nextStep;
}

// go to previous Solution (toplevel)
function previousResult() {
	var focusStep = parseInt(document.getElementById('rangeslider').value);

	var prevStep;
	$($('#visualisation > ul.goal > li').get().reverse()).each(function(index) {
		var step = parseInt($(this).attr('id').replace('step-', ''));

		if ((focusStep > step && step != 2) || step == 1) {
			prevStep = step;
			return false;
		}
	});

	return prevStep;
}

// update '.focus' element
function updateFocus() {
	$('.focus').removeClass('focus');
	var current = document.getElementById('rangeslider').value;

	$('#rangevalue').text(current);

	var focusId = '#step-' + current;
	var focus = $(focusId);
	focus.addClass('focus');
	removeHighlight(focusLine);
	focusLine = parseInt(focus.data('line'));
	highlightLine(focusLine);

	// add .focus to parent choice
	//li > ul.goal > li > ul.subgoals 
	$(focusId).parent().parent().addClass('focus');
}

// highlight line
function highlightLine(line) {
	// Prolog [1,2, ..] -> codeMirror [0, ..]

	// line is int or null ('T' etc)
	if (line) {
		line--;
		return src.addLineClass(line, 'background', 'CodeMirror-highlight');
	}
	return false;
}

function removeHighlight(line) {
	if (line) {
		line--;
		return src.removeLineClass(line, 'background', 'CodeMirror-highlight');
	}
	return false;
}

// line highlight on hover events
function hoverEvents() {
	$('ul.goal li').hover(function() {
		highlightLine(parseInt($(this).data('line')));
	}, function() {
		line = parseInt($(this).data('line'));
		if (line != focusLine) {
			removeHighlight(parseInt($(this).data('line')));
		}
	});
}

// update currently visible events + choice
function updateState() {
	var focusStep = parseInt(document.getElementById('rangeslider').value);
	var focusId = '#step-' + focusStep;
	var focusElem = $(focusId);

	$('.choice-inactive').removeClass('choice-inactive');
	$('.choice-active').removeClass('choice-active');

	$($('.goal').get().reverse()).each(function() {
		//console.log(this)
		foundEvent = false;

		$($(this).children('li').get().reverse()).each(function(index) {
			var event = $(this);
			var port = event.data('port');

			var step = parseInt(event.attr('id').replace('step-', ''));

			// if Event was already found -> dont show, continue.
			if (foundEvent) {
				event.addClass('invisible');
				return true;
			}

			// future step: dont show; 
			if (step > focusStep) {
				event.addClass('invisible');
				return true;
			}

			// contains focus in child elem -> dont show exit/fail (backtracking making these 'undone')
			if (!foundEvent && event.parent().next()[0].contains(focusElem[0])) {
				if (port == 'call' || port == 'unify') {
					event.removeClass('invisible');
					foundEvent = true;
					return true;
				} else {
					event.addClass('invisible');
					return true
				}
			}

			// -> show
			if (!foundEvent) {
				event.removeClass('invisible');
				foundEvent = true;
				return true;
			}

			event.addClass('invisible');

			//console.log(step);
		});

		// if some elem is visible -> parent choice li is visible
		if (foundEvent) {
			// ul.goal > li > ul.subgoals > li
			$(this).parent().parent().parent().addClass('choice-inactive');
		}
	});
	// was added to #main also -> remove here instead of checking in each loop
	$('#main').removeClass('choice-inactive');

	// change class for last visible child element (choice-inactive -> choice-active)
	$('.choices').each(function() {
		var foundLastVisibleChoice = false;
		$($(this).children('li.choice-inactive').get().reverse()).each(function(index) {
			choice = $(this);
			if (!foundLastVisibleChoice) {
				choice.addClass('choice-active');
				choice.removeClass('choice-inactive');
				foundLastVisibleChoice = true;
				return false;
			}
		})
	})
}

/*
	Update Visualisation
	Called for each slider change -> update focus & visualisation
*/
function updateVisualisation() {
	updateFocus();
	updateState();
}

/*
	Ready

	-> Listeners
*/
$(document).ready(function() {
	//$('#run').text('First solution (1)');

	$('#query').on('submit', query);

	$('#steps').on('submit', false);

	$('#src, #query').on('keydown', function() {
		reset();
	});

	$('#rangeslider').on('input', updateVisualisation);
	// IE
	$('#rangeslider').on('change', updateVisualisation);

	//$('#rangeslider').on('focus', function() {this.blur()});

	$('#button-back, #button-back-step, #button-forward-step, #button-forward').on('click', makeStep);

	$('#toggleLists').on('change', function() {
		$('#visualisation').toggleClass('hideLists');
	})

	$('#zoomin').on('click', function() {
		if (scale < 3.5) {
			scale *= 1.25;
			$('#visualisation').css('transform', 'scale(' + scale + ')');
		}
	})
	$('#zoomout').on('click', function() {
		if (scale > 0.45) {
			scale *= 0.80;
			$('#visualisation').css('transform', 'scale(' + scale + ')');
		}
	})

	// Init codeMirror
	src = CodeMirror($('#src').get(0), {
		placeholder: '% Enter your DCG here … \n',
		tabsize: 2,
		scrollbarStyle: 'simple'
	});

});

/* 
	Layout 
*/
// sidebar
jQuery(function($) {
	var $bodyEl = $('body')
	  , $sideEl = $('#controls');

	function showControls() {
		// show overlay
		var options = {
			onclose: function() {
				$sideEl.removeClass('active').appendTo(document.body);
			}
		};

		var $overlayEl = $(mui.overlay('on', options));

		// show element
		$sideEl.appendTo($overlayEl);
		setTimeout(function() {
			$sideEl.addClass('active');
		}, 20);
	}

	function hideControls() {
		$bodyEl.toggleClass('hide-controls');
	}

	$('.js-show-controls').on('click', showControls);
	$('.js-hide-controls').on('click', hideControls);

	//toggle sidebar elements
	var $titleEls = $('strong', $sideEl);

	$titleEls.on('click', function() {
		$(this).next().slideToggle(200);
	});

	/*
		Panning
	*/
	$('#visualisationPanel').on('mousedown', function(e) {
		if ($('#visualisationPanel').hasClass('disabled')) {
			return false;
		}
		var clickX = e.pageX - posX;
		var clickY = e.pageY - posY;
		//var clickY = e.pageY;
		$(document).on('mousemove', function(e) {
			posX = e.pageX - clickX;
			posY = e.pageY - clickY;
			$('#visualisation').css('top', posY);
			$('#visualisation').css('left', posX);
		});
	});
	$(document).on('mouseup', function() {
		$(this).off('mousemove');
	});
});

/* 
	Overlay
*/
function activateOverlay(id) {
	// show overlay
	mui.overlay('on', $('#' + id).clone().get(0));
}
