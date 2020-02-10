var express = require('express');
var http = require('http');
var app = express();
var server = http.createServer(app);
var fs = require('fs');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt');

var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);
var options ={
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '0000',
    database: 'semic'
};
var sessionStore = new MySQLStore(options);
var conn = mysql.createConnection({
    host    :'127.0.0.1',
    port : 3306,
    user : 'root',
    password : '0000',
    database:'semic'
});
var saltRounds = 4;

function handleDisconnect() {
  conn.connect(function(err) {
    if(err) {
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000);
    }
  });

  conn.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') {
      return handleDisconnect();
    } else {
      throw err;
    }
  });
}

handleDisconnect();

app.enable('trust proxy');
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine','ejs');
app.set('views','./views');
app.use(express.static('pub'));
app.use(session({
  secret:"asdfasffdas",
  resave:false,
  saveUninitialized:true,
  store: sessionStore
}));
app.use(bodyParser.json());



app.get('/',function(req,res){
  	if (!req.session.uid) {
    	res.redirect('/login');

  } else {
    var sql = 'SELECT * FROM sc_board WHERE q_username = '+mysql.escape(req.session.uid); // 2020-01-01: 유저 DB 불러오기

    conn.query(sql, function(err, results, field){
      var list_idx = [];
      var list_title = [];
      var list_comm = [];
      var list_time = [];

      for (let i = 0; i < results.length; i++) {
        list_idx.push(results[i].idx);
        list_title.push(results[i].u_title);
        list_comm.push(results[i].u_comm);
        list_time.push(results[i].u_time);
      }

      res.render('index',{
        uid: req.session.uid,
        list_idx: list_idx,
        list_title: list_title,
        list_comm: list_comm,
        list_time: list_time
      });


    });
  }

});

app.get('/login',function(req,res){
    res.render('login');
});

app.get('/signup',function(req,res){
    res.render('signup');
});

app.get('/write',function(req,res){
  if (!req.session.uid) {
    res.redirect('/login');
  } else {
    res.render('write');
  }
});


app.post('/login_ok', function(req, res) {
  //req.session = {};
  var back =  '<script type="text/javascript"> window.location.href="/"; </script>';
  var backs =  "<script type='text/javascript'>alert('로그인 성공'); window.location.href='/'; </script>";

  let body = req.body;
  let uId = body.uid;
  let uPassword = body.upw;
  var sql = 'SELECT * FROM sc_member WHERE u_username = ' + mysql.escape(uId);
  conn.query(sql, function (err, result) {
    if(err) {
      return console.log('Error1');
    } else if (!result.length) {
      return res.json({dn: true, msg: '일치하는 ID 가 없습니다.'});

    } else if (!result[0].u_password) {
      return console.log('Error3');
    }

    //res.send(result[0].Password);
    var hash = result[0].u_password;

      bcrypt.compare(uPassword, hash, function(err, correct) {

       console.log('케셀런: >> '+correct);
       if (correct == true) {
         req.session.uid = uId;
         //res.json({success: true, msg: '로그인 성공.'});
         res.send(backs);

       } else {
         //res.json({success: false, msg: '비밀번호가 일치하지 않습니다.'});
         res.send(back);

       }
      });

  });
  conn.on('error', function() {});
});

app.post('/signup_ok', function(req, res) {
  var backs =  "<script type='text/javascript'>alert('가입 성공'); window.location.href='/'; </script>";

  let body = req.body;
  let uId = body.Id;
  let uPassword = body.Password;
  let uEmail = body.Email;

  bcrypt.hash(uPassword, saltRounds, function(err, hash) {
    var query = 'INSERT INTO sc_member(u_username, u_password, u_email) VALUES(' + mysql.escape(uId) + ","+ mysql.escape(hash) + ","+ mysql.escape(uEmail) + ")";

    conn.query(query, function(err, result){
      bcrypt.compare(uPassword, hash, function(err, correct) {
        console.log('케셀런: >> '+correct);
        if (correct == true) {
          req.session.uid = uId;
          //res.json({success: true, msg: '로그인 성공.'});
          res.send(backs);

        } else {
          //res.json({success: false, msg: '비밀번호가 일치하지 않습니다.'});
          res.send(back);

        }
       });
    });

  });
});

app.post('/write_ok',function(req,res){
  if (!req.session.uid) {
    res.redirect('/login');
  } else {
    var d = new Date();
    var currentDate = d.getFullYear() + "년 " + ( d.getMonth() + 1 ) + "월 " + d.getDate() + "일";
    var sql = 'INSERT INTO sc_board(q_username, u_title, u_comm, u_time) VALUES(' + mysql.escape(req.session.uid) + ","+ mysql.escape(req.body.title) + ","+ mysql.escape(req.body.comm) + ","+mysql.escape(currentDate)+ ")";
    var backs =  "<script type='text/javascript'>window.location.href='/'; </script>";

    conn.query(sql, function(err, result){
      res.send(backs);
    });
  }
});

app.get('/delete_ok/:idx',function(req,res){

  if (!req.session.uid && !req.params.idx) {
    res.redirect('/login');
  } else {
    var sql = 'DELETE FROM sc_board WHERE idx = ' + mysql.escape(req.params.idx);
    var backs =  "<script type='text/javascript'>window.location.href='/'; </script>";

    conn.query(sql, function(err, result){
      res.send(backs);
    });
  }
});

app.get('/logout', function(req, res) {
  //console.log(req);
  req.session.destroy();
  res.redirect('/');
});

server.listen(3002, function() {
  console.log('케셀런: 0.1.0 >> Server listen on port ' + server.address().port);
  console.log('케셀런: Start >> 케셀런 프로젝트에 오신것을 환영합니다.');
});
