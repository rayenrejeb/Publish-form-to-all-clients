/**
 * This is the server file
 * We require our dependencies and initiate our app
 * 
 * @version 1.0.0
 * @author Rayen Rejeb
 */

var express = require('express'); // Framework to initiate App
var socket = require('socket.io'); // The Web Socket
var mongoose = require('mongoose'); // Package to manage MongoDB
var path = require('path'); // Package to manage paths
var csv = require('csv-express');

var app = express();

// Connect to the Mongo DB
mongoose.connect("mongodb://localhost:27017/test", {useNewUrlParser: true });

// Store the DB reference
var db = mongoose.connection;

// Create the Schema for the Profile
var Schema = mongoose.Schema;
var profileSchema = new Schema({
    firstName: String,
    lastName: String,
    ecole: String,
    email: String,
    phone: String
});
var Profile = mongoose.model("Profile", profileSchema);

// We initiate our Server on port 4000
var server = app.listen(3100,function(){
        console.log('listening to requests...')
    });

// Our template files will be in the Public directory

app.get('/', function(req,res){
    res.sendFile(path.join(__dirname + '/public/profiles.html'));
})

app.get('/addprofile', function(req,res){
    res.sendFile(path.join(__dirname + '/public/index.html'));
})

// Export all profiles
app.get('/export', function(req,res){
    Profile.find()
    .select('-_id')
    .select('firstName')
    .select('lastName')
    .select('ecole')
    .select('email')
    .select('phone')
    .lean().exec({}, function(err, products) {
        var filename   = "condidats.csv";
        if (err) res.send(err);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader("Content-Disposition", 'attachment; filename='+filename);
        res.csv(products, true);
    });
})

// Setup our Socket and our events
var io = socket(server);
io.on('connection',function(socket){
  console.log('made socket connection',socket.id);

    // Listen for a new profile insertion
    socket.on('profileAdded', function(data){
        // Save the profile in the Mongo DB
        let newProfile = new Profile({
            firstName: data.firstName,
            lastName: data.lastName,
            ecole: data.ecole,
            email: data.email,
            phone: data.phone
        });
        newProfile.save(function(error){
            
            // Tell the client that the profile was added successfully
            if(!error){
                // Emit insertion to the DataTable
                io.sockets.emit('addprofile', newProfile);

                // Emit insertion to the Add Form
                io.sockets.emit('success', newProfile);
            }

            // Handle Error
            if(error)
                io.sockets.emit('fail', error);

        });
    });

    // Return all Profiles
    socket.on('getAllProfiles', function(data){
        Profile.find({}, function(err,profiles){
            profiles.forEach(function(profile) {
                io.sockets.emit('addprofile', profile);
            });
        });
    });
});

