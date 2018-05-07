function getLists() {
	var listItems = '';
	examples.forEach(function(item, index) {
		if (item.subtitle != null) {
			sub = '&nbsp;<span>('+item.subtitle+')</span>';
		} else {
			sub = '';
		}

		listItems += '<li><a href="#" data-nth="'+ index +'">'+item.name+sub+'</a></li>';
	});
	return listItems;
}

function loadExample(i) {
	ex = examples[i];
	src.setValue(ex.src);
	$('#dcgrule').val(ex.dcgbody);
	$('#list_in').val(ex.in);
	$('#list_out').val(ex.rest);
	$('#query input').removeClass('mui--is-empty mui--is-pristine');
	$('#query input').addClass('mui--is-dirty mui--is-not-empty mui--is-touched');

}

$(document).ready(function() {
	$('#example').on('click', function() {return false;});
	
	$('#example-list').html(getLists());

	$('#example-list > li > a').on('click', function(event){
		loadExample(parseInt($(this).data('nth')));
		// toggle list
		$('#example-list').removeClass('mui--is-open');
		// reset form
		reset();
	});
});

var examples = [
	{
		name:"Sentence",
		src:"sentence --> noun_phrase, verb_phrase.\nnoun_phrase --> determiner, noun.\nverb_phrase --> verb, noun_phrase.\n\ndeterminer --> [the].\ndeterminer --> [a].\nnoun --> [cat].\nnoun --> [mouse].\nverb --> [chases].\n",
		dcgbody:"sentence",
		in:"S",
		rest:"[]"
	},
	{
		name:"Sentence",
		subtitle:"strings",
		src:"sentence --> noun_phrase, space, verb_phrase.\nnoun_phrase --> determiner, space, noun.\n\nverb_phrase --> verb, space, noun_phrase.\n\ndeterminer --> \"the\".\ndeterminer --> \"a\".\nnoun --> \"cat\".\nnoun --> \"mouse\".\nverb --> \"chases\".\n\nspace --> \" \".",
		dcgbody:"noun_phrase",
		in:"\"a mouse\"",
		rest:"\"\""
	},
	{
		name:"Sentence",
		subtitle:"plural",
		src:"sentence --> noun_phrase(N), verb_phrase(N).\n\nnoun_phrase(N) --> determiner(N), noun(N).\nverb_phrase(N) --> verb(N), noun_phrase(_).\n\ndeterminer(_) --> [the].\ndeterminer(singular) --> [a].\ndeterminer(plural) --> [].\n\nnoun(singular) --> [cat].\nnoun(plural) --> [cats].\nnoun(singular) --> [mouse].\nnoun(plural) --> [mice].\n\nverb(singular) --> [chases].\nverb(plural) --> [chase].",
		dcgbody:"sentence",
		in:"S",
		rest:"[]"
	},
	{
		name:"Palindrome",
		src:"palin --> [].\npalin --> letter(_).\npalin --> letter(X), palin, letter(X).\n\nletter(X) --> [X], \n  {\n    member(X, [a,b,c])\n  }.",
		dcgbody:"palin",
		in:"[a,b,a]",
		rest:"[]"
	},
	{
		name:"bs",
		src:"bs --> [b].\nbs --> [b], bs.",
		dcgbody:"bs",
		in:"B",
		rest:"[]"
	},
	{
		name:"bs",
		subtitle:"left-recursive",
		src:"bs --> bs, [b].\nbs --> [b].",
		dcgbody:"bs",
		in:"B",
		rest:"[]"
	}
];