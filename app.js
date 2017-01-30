var path           = require('path');
var http           = require('http');
var https          = require('https');

var async          = require('async');
var bodyParser     = require('body-parser');
var cookieParser   = require('cookie-parser');
var domain         = require('domain');
var express        = require('express');
var methodOverride = require('method-override');
var morgan         = require('morgan');

var app = express();

var server         =  http.createServer(app);

var gracefullyClosing = false;

  /*
   * All unexpected error will catch here instead of uncaught exception
   * so we can shutdown specified process gracefully
   */
app.use(function domainMiddleware(req, res, next) {
    var d = domain.create();

    d.once('error', function(err) {
        // Note: we're in dangerous territory!
        // By definition, something unexpected occurred,
        // which we probably didn't want.
        // Anything can happen now!  Be very careful!
       try {
           console.error('error Catch By Domain Error', err.stack);
           //next(err);
           gracefulShutdown('Domain Graceful close fired ' + err);
          // d.dispose();
       } catch (er2) {
           // oh well, not much we can do at this point.
           console.error('Error sending 500!', er2.stack);
       }
    });

    d.add(req);
    d.add(res);

    d.run(function() {
        next();
    });
});

app.set('views', __dirname + '/jadeTemplate');
app.engine('jade', require('jade').__express);
app.set('view engine', 'jade');
app.use(express.static(path.join(__dirname + '/public'))); // set the static files location /public/img will be /img for users
//app.use(morgan('short'));                                  // log every request to the console

app.use(methodOverride());                      // simulate DELETE and PUT
app.use(bodyParser.urlencoded({                            // pull information from html in POST
    extended: true,
    limit: '5mb'
}));
app.use(bodyParser.json({limit: '5mb'}));
app.use(cookieParser());

app.enable('trust proxy');
app.disable('x-powered-by');

var env = process.env.NODE_ENV || 'development';
console.log(env);
if ('development' === env) {
   // configure stuff here
   //siya console.log('Development mode');
}

//route middleware that will happen on every request
app.use(function(req, res, next) {
    res.set('Access-Control-Allow-Origin', '*');

    /*
     * When node app will graceful shutdown then first request's response will 503
     * so nginx will break keep alive connection with that particular process
     */
    if (gracefullyClosing){
        res.set({
            'Connection': 'close'
        });
        res.status(503).send('Service Temporarily Unavailable');
    }
    else{
        // continue doing what we were doing and go to the route
        next();
    }
});

var apiRouter = express.Router();

apiRouter.use(function(req, res, next) {
	  res.set({
		    'Cache-Control': 'no-cache, no-store, must-revalidate',
			  'Expires': '0',
			  'Pragma': 'no-cache'
	  });
    return next();
});

apiRouter.get('/', function(req, res) {
    res.sendFile(__dirname + '/html/index/index.html' , function (err) {
        if (err) {
        }
    });
});

//apply the api route to our application
app.use('/', apiRouter);

server.listen(3000, function () {
    console.log('CodeDeploy Server listening at port %d', 3000);
});

process.on('SIGINT', function() {
    console.log('Got SIGINT.  Press Control-D to exit.');
    gracefulShutdown('SIGINT close fired');
});


process.on('SIGTERM', function() {
    console.log('Got SIGTERM.  Press Control-D to exit.');
    gracefulShutdown('SIGTERM close fired');
});

process.on('message', function(msg) {
  // console.log(msg == 'shutdown');
	 console.log('PM2 GRACEFUL SIYA-' + msg);
  // console.log(msg == 'shutdown');
  // console.log(msg === 'shutdown');
    if (msg == 'shutdown') {
        //console.log(gracefullyClosing === false);
        //console.log('Closing all connections...' + gracefullyClosing);

        //gracefulShutdown('pm2 shutdown');

        if (gracefullyClosing === false){
          //console.log('1 step under');
            gracefullyClosing = true;

            // make sure we close down within 30 seconds
            var killtimer = setTimeout( function() {
                console.log('FOREFULLY GRACEFUL MSG FROM KILLTIMER %s', msg);
                //io.close();
                process.exit(1);
            }, 10 * 1000);
            // But don't keep the process open just for that!
            killtimer.unref();

            server.close(function(){
                // Disconnect from cluster master
                //process.disconnect && process.disconnect();
                console.log('SMOOTH GRACEFUL MSG %s', msg);
                //io.close();
                process.exit(1);
            });

            //console.log('last step under');
       }
    }
    else{
      console.log('shutdown message not fired');
    }
});

process.on('uncaughtException', function(err) {
    console.log('unCaught exception: ' + err);
    gracefulShutdown('uncautchexeption close fired ' + err);
});

var gracefulShutdown = function (msg){
    console.log('gracefulShutdown method ' + msg);

    if (server === undefined) { console.log('return fired'); return; }
    //app.set("isShuttingDown", true);
    //if(app.get("isShuttingDown") {}
    if (gracefullyClosing === false){
        gracefullyClosing = true;
        // make sure we close down within 30 seconds
        var killtimer = setTimeout( function() {
            console.log('FOREFULLY GRACEFUL MSG FROM KILLTIMER %s', msg);
            //io.close();
            process.exit(1);
        }, 100 * 1000);
        // But don't keep the process open just for that!
        killtimer.unref();

        server.close(function(){
            // Disconnect from cluster master
            //process.disconnect && process.disconnect();
            console.log('SMOOTH GRACEFUL MSG %s', msg);
            //io.close();
            process.exit(1);
        });
   }
};

setInterval(function(){
    //console.log('gc fired');
    //global.gc();
}, 120000);
