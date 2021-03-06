var db = require('../db/db')

var constant = require('../constant')
var dcase = require('../model/dcase')
var model_commit = require('../model/commit')
var node = require('../model/node')
function getDCaseList(params, callback) {
    var con = new db.Database();
    con.query('SELECT * FROM dcase', function (err, result) {
        if(err) {
            con.close();
            throw err;
        }
        con.close();
        var list = [];
        result.forEach(function (val) {
            list.push({
                dcaseId: val.id,
                dcaseName: val.name
            });
        });
        callback.onSuccess(list);
    });
}
exports.getDCaseList = getDCaseList;
function getDCase(params, callback) {
    var con = new db.Database();
    con.query({
        sql: 'SELECT * FROM dcase d, commit c WHERE d.id = c.dcase_id AND c.latest_flag=TRUE and d.id = ?',
        nestTables: true
    }, [
        params.dcaseId
    ], function (err, result) {
        if(err) {
            con.close();
            throw err;
        }
        con.close();
        var c = result[0].c;
        var d = result[0].d;
        callback.onSuccess({
            commitId: c.id,
            dcaseName: d.name,
            contents: c.data
        });
    });
}
exports.getDCase = getDCase;
function getNodeTree(params, callback) {
    var con = new db.Database();
    con.query({
        sql: 'SELECT * FROM commit WHERE id = ?',
        nestTables: true
    }, [
        params.commitId
    ], function (err, result) {
        if(err) {
            con.close();
            throw err;
        }
        con.close();
        var c = result[0].commit;
        callback.onSuccess({
            contents: c.data
        });
    });
}
exports.getNodeTree = getNodeTree;
function createDCase(params, callback) {
    var userId = constant.SYSTEM_USER_ID;
    var con = new db.Database();
    con.begin(function (err, result) {
        var dc = new dcase.DCase(con);
        dc.insert({
            userId: userId,
            dcaseName: params.dcaseName
        }, function (dcaseId) {
            var commitDAO = new model_commit.CommitDAO(con);
            commitDAO.insert({
                data: JSON.stringify(params.contents),
                dcaseId: dcaseId,
                userId: userId,
                message: 'Initial Commit'
            }, function (commitId) {
                var nd = new node.Node(con);
                nd.insertList(commitId, params.contents.NodeList, function () {
                    con.commit(function (err, result) {
                        callback.onSuccess({
                            dcaseId: dcaseId,
                            commitId: commitId
                        });
                        con.close();
                    });
                });
            });
        });
    });
}
exports.createDCase = createDCase;
function commit(params, callback) {
    var userId = constant.SYSTEM_USER_ID;
    var con = new db.Database();
    con.begin(function (err, result) {
        var commitDAO = new model_commit.CommitDAO(con);
        commitDAO.get(params.commitId, function (com) {
            console.log(com);
            commitDAO.insert({
                data: JSON.stringify(params.contents),
                prevId: params.commitId,
                dcaseId: com.dcaseId,
                userId: userId,
                message: params.commitMessage
            }, function (commitId) {
                var nd = new node.Node(con);
                nd.insertList(commitId, params.contents.NodeList, function () {
                    con.commit(function (err, result) {
                        callback.onSuccess({
                            commitId: commitId
                        });
                        con.close();
                    });
                });
            });
        });
    });
}
exports.commit = commit;
;
function getCommitList(params, callback) {
    var con = new db.Database();
    var commitDAO = new model_commit.CommitDAO(con);
    commitDAO.list(params.dcaseId, function (list) {
        con.close();
        var commitList = [];
        list.forEach(function (c) {
            commitList.push({
                commitId: c.id,
                dateTime: c.dateTime,
                commitMessage: c.message,
                userId: c.userId,
                userName: c.user.name
            });
        });
        callback.onSuccess({
            commitList: commitList
        });
    });
}
exports.getCommitList = getCommitList;
