var express = require('express');
var router = express.Router();

var query = require('../backend/db/query');

/* API. */
router.get('/transactions', function(req, res) {
  query.getTransactions().then(function(transactions) {
    res.send(transactions);
  }, function(error) {
    console.log(error);
    res.sendStatus(500);
  })
});

router.get('/users', function(req, res) {
  query.getUsers().then(function(users) {
    res.send(users);
  }, function(error) {
    console.log(error);
    res.sendStatus(500);
  });
});

router.post('/users', function(req, res) {
  query.editUser(req.body).then(function(user) {
    res.sendStatus(200);
  }, function(err) {
    console.log('Error', err);
    res.sendStatus(500);
  })
});

router.delete('/users', function(req, res) {
  query.deleteUser(req.body).then(function(user) {
    res.sendStatus(200);
  }, function(err) {
    console.log('Error', err);
    res.sendStatus(500);
  });
});

router.post('/transactions', function(req, res) {
  query.editTransaction(req.body).then(function() {
    res.sendStatus(200);
  }, function(err) {
    console.log(err);
    res.sendStatus(500);
  });
});

router.delete('/transactions', function(req, res) {
  query.deleteTransaction(req.body).then(function() {
    res.sendStatus(200);
  }, function(err) {
    console.log(err);
    res.sendStatus(500);
  })
});

router.get('/tasks', function(req, res) {
  query.getTasks(req.body).then(function(tasks) {
    res.send(tasks);
  }, function(err) {
    console.log('Error', err);
    res.sendStatus(500);
  });
});

router.post('/tasks', function(req, res) {
  query.editTask(req.body).then(function(tasks) {
    res.sendStatus(200);
  }, function(err) {
    console.log('Error', err);
    res.sendStatus(500);
  });
});

router.get('/task_done', function(req, res) {
  query.getTasksDone().then(function(tasks) {
    res.send(tasks);
  }, function(err) {
    console.log('Error', err);
    res.sendStatus(500);
  });
});

router.post('/task_done', function(req, res) {
  query.markTaskAsDone(req.body).then(function(tasks) {
    res.send(tasks);
  }, function(err) {
    console.log('Error', err);
    res.sendStatus(500);
  });
});

module.exports = router;
