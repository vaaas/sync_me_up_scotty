// jshint esversion: 6
// jshint asi: true
window.onload = function () {
"use strict"
const returnmap = {}

function randomid () { return new Date().getTime() + Math.random() }

function $ (q) { return document.querySelector(q) }

function $$ (q) { return document.querySelectorAll(q) }

function forEach (arr, fn) {
	for (let i = 0, len = arr.length; i < len; i++)
		fn(arr[i], i, len) }

function file_selected (e) {
	const a = document.createElement("source")
	a.src = URL.createObjectURL(e.target.files[0])
	elems.video.appendChild(a) }

function subs_selected (e) {
	const a = document.createElement("track")
	a.kind = "subtitles"
	a.src = URL.createObjectURL(e.target.files[0])
	elems.video.appendChild(a) }

function sync_pressed (e) {
	send(ws, RPC("sync")) }

function RPC (fn, args) {
	return { "fn": fn, "args": args ? args : [] } }

function send (socket, what, cb) {
	what.id = randomid()
	socket.send(JSON.stringify(what))
	if (cb) returnmap[what.id] = cb }

function on_open () {
	ws.onmessage = on_message
	send(ws, RPC("auth", [prompt("Password", "")])) }

function on_message (message) {
	console.log(message.data)
	const obj = JSON.parse(message.data)
	switch(obj.fn) {
		case "pause":
			elems.video.pause()
			break
		case "resume":
			elems.video.play()
			break
		case "time?":
			ws.send(JSON.stringify({ fn: "ret", args: [elems.video.currentTime], id: obj.id}))
			break
		case "time":
			elems.video.currentTime = obj.args[0]
			break }}

function key_pressed (e) {
	if (e.charCode === 112) toggle_video() }

function toggle_video() {
	if (elems.video.paused) {
		elems.video.play()
		send(ws, RPC("resume")) }
	else {
		elems.video.pause()
		send(ws, RPC("pause")) } }

window.onkeypress = key_pressed

const elems = {
	file: $("#file"),
	subs: $("#subs"),
	sync: $("#sync"),
	video: $("video") }

elems.file.onchange = file_selected
elems.subs.onchange = subs_selected
elems.sync.onclick = sync_pressed

const ws = new WebSocket("ws://" + window.location.hostname + ":8001")
ws.onopen = on_open
}
