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
  // res.send([{name: 'Corentin', id:'abc'}, {name: 'Antoine', id:'def'}, {name: 'Emilie', id:'sdqf'}]);
});

router.post('/transactions/new', function(req, res) {
  query.saveTransaction(req.body).then(function() {
    res.sendStatus(200);
  }, function(err) {
    console.log(err);
    res.sendStatus(500);
  });
});

module.exports = router;
