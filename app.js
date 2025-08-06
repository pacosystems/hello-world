/*
 * Simple HTTP server to output some data.
 */
const   http        = require('http'),
        path        = require('path'),
        os          = require('os'), 
        fs          = require('fs'), 
        uuid        = require('uuid'),
        colour      = require('randomcolor'),
        Handlebars  = require('handlebars'),
        moment      = require('moment'),
        DatabaseTester = require('./lib/database-tester'),
        port        = process.env.PORT || 3000;
        

class HelloWorldServer {
    
    constructor () {

      let previousMTime = new Date(0);
      
      this.index = path.resolve(__dirname, 'files/index.htm');

      fs.watch(this.index, async (event, filename) => {
        if (filename) {
          const stats = fs.statSync(this.index);
          if (stats.mtime.valueOf() === previousMTime.valueOf()) {
            return;
          }
          previousMTime = stats.mtime;
          console.log(`${filename} file Changed`);
          await this.loadContent ();
        }
      });
        
      this.startTime  = new Date().getTime(); 
      this.instance   = uuid.v4();
      this.colour     = colour();
      this.dbTester   = new DatabaseTester();
      this.server     = this.startServer();
      
      //
      this.server.listen(port, async (err) => {
        await this.loadContent();
        if (err) {
          return console.error(`hello-world raised an exception: ${err}`);
        }
        console.log(`hello-world is listening on port ${port}`)
      });
    }

    loadContent () {

      return new Promise((resolve, reject)=>{
        this.html       = fs.readFileSync(this.index, 'utf8'); 
        this.template   = Handlebars.compile(this.html);

        resolve();
      });
    }
    
    startServer() {
      let server = http.createServer((request, response) => {
        // Parse the request URL
        const url = new URL(request.url, `http://${request.headers.host}`);
        const pathname = url.pathname;
        const hostname = os.hostname();
        const instance = this.instance;

        // Define routes
        if (pathname === '/state/kill') {
            // Handle /state/kill route
            // You can add logic here to gracefully shut down your server
            response.writeHead(200, {'Content-Type': 'text/plain'});
            response.end('Shutting down server...');
            //
            console.log(`Shutting down server ${hostname} / ${instance} from kill request...`);
            // send a SIGINT to the process
            process.kill(process.pid, 'SIGINT');

        } else {
            // Default route
            let data = {
                platform:   os.platform(),
                hostname,
                instance,
                colour:     this.colour,
                env:        this.getEnvironment(),
                databases:  this.dbTester.getFormattedStatus(),
                localTime:  moment().format(),
                utcTime:    moment.utc().format(),
                uptime:     this.getUptime()
            };
            let html = this.template(data);
            
            response.writeHead(200, {'Content-Type': 'text/html'});
            response.write(html);
            response.end();
        }
      });
    
      return server;
    }
    
    getUptime () {
        
      let now  = new Date().getTime();
      return moment.duration(now - this.startTime).humanize();
    }
    
    getEnvironment () {
        
      let keys = Object.keys(process.env);
      return keys.sort((a, b)=>{
          return a.localeCompare(b);
        }).map((e)=>{
          return `<strong>${e}</strong>: ${process.env[e]}`;
        }).join('\n');
    }
}

// handle SIGINT properly
process.on('SIGINT', async function() {
  console.log('Shutting down gracefully...');
  const server = global.helloWorldServer;
  if (server && server.dbTester) {
    await server.dbTester.cleanup();
  }
  process.exit();
});

global.helloWorldServer = new HelloWorldServer();
