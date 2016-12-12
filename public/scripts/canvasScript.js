var socket = io();

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext("2d");

var preview_canvas = document.getElementById('preview_canvas');
var preview_ctx = preview_canvas.getContext("2d");

var size = document.getElementById('size');
var color = document.getElementById('color');

var dBut = document.getElementById("downloadBut");

window.addEventListener('mousedown', function(){
	draw_preview()}, false);
size.addEventListener("input", function(){
	draw_preview()}, false);
color.addEventListener("input", function(){
	draw_preview()}, false);
canvas.addEventListener("mousedown", function(e){
	findMove('down', e)}, false);
canvas.addEventListener("mousemove", function(e){
	findMove('move', e)}, false);
canvas.addEventListener("mouseup", function(e){
	findMove('up', e)}, false);
canvas.addEventListener("mouseout", function(e){
	findMove('out', e)}, false);
window.addEventListener('resize', function(e){
  scale_canvas(e)}, false);
window.addEventListener('scroll', function(e){
	scale_canvas(e)}, false);
dBut.addEventListener('click', dlCanvas, false);


canvas.addEventListener("touchstart", function(e){
	touchMove('down', e)}, false);
canvas.addEventListener("touchmove", function(e){
	touchMove('move', e)}, false);
canvas.addEventListener("touchend", function(e){
	touchMove('up', e)}, false);
canvas.addEventListener("touchcancel", function(e){
	touchMove('out', e)}, false);

var flag = false;
var prevCordX = 0;
var prevCordY = 0;
var newCordX = 0;
var newCordY = 0;
var dot_flag = false;
var new_change_flag = false;

//Will look like:
// coordinates = [[SIZE, COLOR],[x1,y1],[x2,y2]...[xn, yn]]
var coordinates = [];
var rect = canvas.getBoundingClientRect();


function touchMove(res, e){
	switch(res){
		case 'down':
			window.blockMenuHeaderScroll = true;
			touch = e.changedTouches[0];
			touches = e.changedTouches;

			newCordX = touch.pageX - rect.left;
			newCordY = touch.pageY - rect.top;

			coordinates.push(size.value, "#"+color.value);
			frst_coord_tuple = [newCordX, newCordY];
			coordinates.push(frst_coord_tuple);

			ctx.beginPath();
			ctx.fillStyle = "#" + color.value;
			ctx.fillRect = (newCordX, newCordY, size.value, size.value);
			ctx.closePath();

		break;
		case 'move':
			if (blockMenuHeaderScroll)
	    {
	        e.preventDefault();
	    }

			touch = e.changedTouches[0];

			//Set old mouse coordinates to "new" previous coordinates
			prevCordX = newCordX;
			prevCordY = newCordY;
			//Current relative mouse coordinates.
			newCordX = touch.pageX - rect.left;
			newCordY = touch.pageY - rect.top;

			coord_tuple = [newCordX, newCordY];
			coordinates.push(coord_tuple);

			if(coordinates.length > 50){
				socket.emit('drawControl', {type: 'coordinates', coord_data: coordinates} );
				coordinates = [];
				coordinates.push(size.value, "#"+color.value);
				coordinates.push(coord_tuple);
			}

			draw();
		break;
		case 'up':
			socket.emit('drawControl', {type: 'coordinates', coord_data: coordinates} );
			//Clear coordinates
			coordinates = [];
			window.blockMenuHeaderScroll = false;
		break;
		case 'out':
			socket.emit('drawControl', {type: 'coordinates', coord_data: coordinates} );
			//Clear coordinates
			coordinates = [];
			window.blockMenuHeaderScroll = false;
		break;
	}
}
function dlCanvas() {
	canvas.toBlob(function(blob) {
			saveAs(blob, "output.gif");
	}, "image/gif");
};

socket.on('connect', function(){
	initCanvas();
	socket.emit('drawControl',{type:'wantCanvas'});
	draw_preview();
});

socket.on('ext_coordinates', function (data){
  draw_ext(data);
  if(flag) {
  	new_change_flag = true;
  }
});


socket.on('latestCanvas', function(data){
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	var img = new Image;

	img.onload = function(){
		ctx.drawImage(img,0,0);
	}

	img.src = data;
});

socket.on('ext_clear', function(data) {
	clearCanvas();
});

socket.on('curr_vote', function(data) {
	if(data)
		document.getElementById('specificUserVote').innerHTML = "Yes!";
	else if(!data)
		document.getElementById('specificUserVote').innerHTML = "No!";
});

function draw_ext(data){
	var sizeVal = data[0];
	var colorVal = data[1];

  for (var i = 3; i < data.length; i++) {
	prev_temp_data = data[i-1];
	temp_data = data[i];

	ctx.beginPath();
	ctx.lineCap = "round";
	ctx.moveTo(prev_temp_data[0], prev_temp_data[1]);
	ctx.lineTo(temp_data[0], temp_data[1]);
	ctx.lineWidth = sizeVal;
	ctx.strokeStyle = colorVal;
	ctx.stroke();
  }
}
function findMove(res, e) {
	if(res == 'down') {
		//If a new change has happened before the local user has "commited" their change, the local changes overwrites the external changes.
		if(new_change_flag) {
			draw_ext(coordinates);
			new_change_flag = false;
		}

		//Set old mouse coordinates to "new" previous coordinates
		prevCordX = newCordX;
		prevCordY = newCordY;
		//Current relative mouse coordinates
		newCordX = e.clientX - rect.left;
		newCordY = e.clientY - rect.top;

		//Add brush color and size as first element in coordinates array.
		coordinates.push(size.value, "#"+color.value);
		frst_coord_tuple = [newCordX, newCordY];
		coordinates.push(frst_coord_tuple);
		flag = true;
		dot_flag = true;

		if(dot_flag) {
			ctx.beginPath();
			ctx.fillStyle = "black";
			ctx.fillRect = (newCordX, newCordY, size.value, size.value);
			ctx.closePath();
			dot_flag = false;
			coordinates.push([newCordX, newCordY]);
		}
	}

	if(res == 'up' || res == 'out') {
		//Send coordinates to server when user lets go of mouse
	  	//* UNCOMMENT IF YOU RUN INDEX.HTML IN A NODEJS SERVER!!! *
	 	socket.emit('drawControl', {type: 'coordinates', coord_data: coordinates} );
		//Clear coordinates
		coordinates = [];

		flag = false;
	}

	if(res == 'move' && flag) {
		//If a new change has happened before the local user has "commited" their change, the local changes overwrites the external changes.
		if(new_change_flag) {
			draw_ext(coordinates);
			new_change_flag = false;
		}

		//Set old mouse coordinates to "new" previous coordinates
		prevCordX = newCordX;
		prevCordY = newCordY;
		//Current relative mouse coordinates.
		newCordX = e.clientX - rect.left;
		newCordY = e.clientY - rect.top;

		//Save mouse coordinates to send to server
		coord_tuple = [newCordX, newCordY];
		coordinates.push(coord_tuple);

		if(coordinates.length > 50){
			socket.emit('drawControl', {type: 'coordinates', coord_data: coordinates} );
			coordinates = [];
			coordinates.push(size.value, "#"+color.value);
			coordinates.push(coord_tuple);
		}

		draw();
	}
}

function draw() {
	//Both these values will be sent to server
	var sizeVal = size.value;
	var colorVal = "#"+color.value;

  ctx.beginPath();
	ctx.lineCap = "round";
  ctx.moveTo(prevCordX, prevCordY);
  ctx.lineTo(newCordX, newCordY);
  ctx.lineWidth = sizeVal;
  ctx.strokeStyle = colorVal;
  ctx.stroke();

	draw_preview();
}

function draw_preview(){
	preview_ctx.clearRect(0,0, preview_canvas.width, preview_canvas.height);
	var sizeVal = size.value;
	var colorVal = "#"+color.value;

	x = preview_canvas.width /4;
	y = preview_canvas.height /2;
  preview_ctx.beginPath();
	preview_ctx.lineCap = "round";
  preview_ctx.moveTo(x, y);
  preview_ctx.lineTo(x, y);
  preview_ctx.lineWidth = sizeVal;
  preview_ctx.strokeStyle = colorVal;
  preview_ctx.stroke();
}
function scale_canvas(e){
  rect = canvas.getBoundingClientRect();
}

function clearCanvas() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function initCanvas() {
	ctx.fillStyle = "white";
	ctx.fillRect(0,0,600,600);
}
