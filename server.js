#!/usr/bin/env node
// jshint asi: true
// jshint esversion: 6

const http = require("http")
const fs = require("fs")
const path = require("path")
const os = require("os")
const url = require("url")
const ws = require("uws")
const determine_mime_type = require("determine-mime-type")

function WebSocketServer (ip, port) {
	let canon_socket = null
	const returnmap = {}
	const server = new ws.Server({ port: port, host: ip})
	server.on("connection", on_connection)
	console.log("websocket listening to", ip + ":" + port)

	function randomid () { return new Date().getTime() + Math.random() }

	function on_connection (socket) {
		socket.on("message", on_message)
		socket.auth = false }

	function on_message (message) {
		console.log(this.auth, message)
		let obj
		try {
			obj = JSON.parse(message) }
		catch (e) {
			this.close() }
		switch(obj.fn) {
			case "auth":
				auth(this, ...obj.args)
				break
			case "pause":
				if (this.auth) pause(this)
				break
			case "resume":
				if (this.auth) resume(this)
				break
			case "sync":
				if (this.auth) sync(this)
				break
			case "ret":
				if (this.auth) ret(this, obj.id, ...obj.args)
				break
			default:
				this.close()
				break }}

	function RPC (fn, args) {
		return {
			"fn": fn,
			"args": args ? args : [] }}
	
	function auth (socket, password) {
		if (password === "user")
			socket.auth = true
		else if (password === "admin") {
			socket.auth = true
			canon_socket = socket }
		else socket.close() }

	function pause (socket) {
		broadcast(RPC("pause")) }

	function resume (socket) {
		broadcast(RPC("resume")) }

	function sync (socket) {
		send(canon_socket, RPC("time?"), function (val) {
			broadcast(RPC("time", [val])) })}

	function ret (socket, id, value) {
		if (returnmap[id] !== undefined) returnmap[id](value) }

	function broadcast (what, cb) {
		server.clients.forEach(client => {
			what.id = randomid()
			client.send(JSON.stringify(what))
			if (cb) returnmap[what.id] = cb })}

	function send (socket, what, cb) {
		what.id = randomid()
		socket.send(JSON.stringify(what))
		if (cb) returnmap[what.id] = cb }}

function Serve (root, ip, port) {
	const server = http.createServer(request_listener)
	server.listen(port, ip)
	console.log("Listening on", ip + ":" + port)

	function something_went_wrong (res) {
		res.statusCode = 400
		res.setHeader("Content-Type", "text/plain")
		res.end("Something went wrong") }

	function send_file (pathname, res) {
		const stream = fs.createReadStream(pathname)
		stream.on("open", () => {
			res.statusCode = 200
			res.setHeader("Content-Type", determine_mime_type(pathname))
			stream.pipe(res) })
		stream.on("error", () => { something_went_wrong (res) }) }

	function request_listener(req, res) {
		const u = url.parse(req.url)
		const p = u.pathname === "/" ? path.join(root, "index.html") : path.join(root, u.pathname)
		file_ok_p(p, (flag) => {
			if (flag) send_file(p, res)
			else something_went_wrong(res) }) }
	
	function file_ok_p (pathname, cb) {
		fs.stat(pathname, (err, stats) => {
			if (err) cb(false)
			else if (stats.isFile()) cb(true)
			else cb(false) }) } }

function sensible_ip() {
	const ifaces = os.networkInterfaces()
	for (let iface in ifaces) {
		if (!ifaces.hasOwnProperty(iface)) continue
		iface = ifaces[iface]
		for (let i = 0; i < iface.length; i++)
			if (iface[i].family === "IPv4" && iface[i].internal === false)
				return iface[i].address }
	return "localhost" }


function main() {
	const ip = process.argv[1] ? process.argv[2] : "0.0.0.0"
	Serve("./", ip, 8000)
	WebSocketServer(ip, 8001) }

main()
