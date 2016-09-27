"use strict";

let ActressModel  = require("../models/actressModel");
let VideoModel    = require("../models/videoModel");
let CategoryModel = require("../models/categoryModel");
let SeriesModel   = require("../models/seriesModel");
let numberUtil    = require('../utils/numberUtil');
let jsonUtil      = require('../utils/jsonUtil');
let mongoose      = require('mongoose');

exports.getVideo = function *() {
	const startIndex = numberUtil.toInt(this.params.startIndex);
	const count = numberUtil.toInt(this.params.count);
	const sortType = numberUtil.toInt(this.params.sortType);
	const keyWord = jsonUtil.myDecodeURIComponent(this.params.keyWord);

	let condition = {};
	if (keyWord !== "!") {
		condition.code = {$regex: keyWord.toUpperCase()};
	}
	let sortCondition = {};
	if (sortType === 1) {
		// 按照评分排序从大到小排序
		sortCondition.score = -1;
	} else if (sortType === 2) {
		// 按照评分排序从小到大排序
		sortCondition.score = 1;
	} else if (sortType === 3) {
		// 按照生成日期排序从大到小排序
		sortCondition.date = -1;
	} else if (sortType === 4) {
		// 按照生成日期排序从小到大排序
		sortCondition.date = 1;
	} else if (sortType === 5) {
		// 按照番号排序从大到小排序
		sortCondition.code = -1;
	} else if (sortType === 6) {
		// 按照番号排序从小到大排序
		sortCondition.code = 1;
	}

	let videoes = yield VideoModel.find(condition).sort(sortCondition).limit(count).skip(startIndex);
	const totalCount = yield VideoModel.count(condition);
	this.body = jsonUtil.createAPI(1, {video: jsonUtil.videoes2Json(videoes), count: totalCount});
};

exports.addVideo = function *() {
	const code = this.params.code;
	let video = yield VideoModel.findOne({code: code});
	if (!video) {
		const name = this.params.name;

		let arr = this.params.date.split('-');
		const date = new Date(arr[0], arr[1], arr[2]);

		arr = this.params.actress.split('&');
		const actress = [];
		let a = null;
		for (let i = 0; i < arr.length; i++) {
			a = yield ActressModel.findOne({$or: [
				{name: arr[i]},
				{alias: {$regex: arr[i]}}
			]}, {name: 1});
			if (a) {
				actress.push(a._id);
			}
		}

		arr = this.params.category.split('&');
		const category = [];
		let c = null;
		for (let i = 0; i < arr.length; i++) {
			c = yield CategoryModel.findOne({name: arr[i]});
			if (!c) {
				c = new CategoryModel({name: arr[i]});
				yield c.save();
			}
			category.push(c._id);
		}

		let series = yield SeriesModel.findOne({name: this.params.series});
		if (!series) {
			series = new SeriesModel({name: this.params.series});
			yield series.save();
		}
		series = series._id;

		video = new VideoModel({
			code: code,
			name: name,
			date: date,
			category: category,
			series: series,
			actress: actress
		});
		yield video.save();
	}
	this.body = jsonUtil.createAPI(1, jsonUtil.video2Json(video));
};

exports.addActressToVideo = function *() {
	const id = this.params.id;
	let video = yield VideoModel.findOne({_id: id});
	if (video) {
		let actress = yield ActressModel.findOne({name: this.params.actress});
		if (actress) {
			yield VideoModel.update({_id: id}, {$addToSet: {actress: actress._id}});
			this.body = jsonUtil.createAPI(1);
		} else {
			this.body = jsonUtil.createAPI(-2, `没有找到演员:${this.params.actress}`);
		}
	} else {
		this.body = jsonUtil.createAPI(-1, `没有找到影片:${id}`);
	}
};
