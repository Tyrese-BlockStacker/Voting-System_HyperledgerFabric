const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const axios = require("axios");
const requireLogin = require("../Middleware/requirelogin");

//Registering Models
require("../Models/party");
require("../Models/criminal");
require("../Models/candidate");
require("../Models/nadra");
require("../Models/election");

//Models
const Party = mongoose.model("Party");
const Candidate = mongoose.model("Candidate");
const Criminal = mongoose.model("Criminal");
const Nadra = mongoose.model("Nadra");
const Election = mongoose.model("Election");

router.post("/createparty", async (req, res) => {
  const { partyName, partyImg, partySymbol, partyLeaderCnic, candidate } =
    req.body;

  if (
    !partyName ||
    !partyImg ||
    !partyLeaderCnic ||
    !partySymbol ||
    !candidate
  ) {
    return res.json({ message: "one or more fields are empty" });
  }

  const nadra = await Nadra.find({}).lean();

  const nadraCnics = nadra.map((citizen) => {
    return Number(citizen.cnic);
  }); //converts mongoose number to number

  let check5 = false;
  nadraCnics.map((cnic) => {
    if (cnic == partyLeaderCnic) {
      check5 = true;
    }
  }); //checks whether party leader exists in nadra

  if (!check5 || check5 == false) {
    return res.json({ message: "party leader does not exist in nadra" });
  }

  const candidates = await Candidate.find({})
    .select(
      "-position -partyId -voters -voteCount -is_criminal -_id -__v -ballotId -name"
    )
    .lean();

  /*   console.log(candidates);
   */
  const cnics = candidates.map((num) => {
    return Number(num.cnic);
  }); //converts Mongoose number,returns candidateDB cnics as JS Number

  const fieldCnic = candidate.map((cand) => {
    return Number(cand.cnic);
  });

  let check6 = false;

  fieldCnic.map((cnic) => {
    for (var i = 0; i < nadraCnics; i++) {
      if (cnic != nadraCnics) {
        check6 = true;
      }
    }
  }); //checks if candidates exist in nadra

  if (check6 || check6 == true) {
    return res.json({
      message:
        "one or more of the candidates does not exist in nadra, check their cnic",
    });
  }

  const parties = await Party.find({}).lean();

  let check3 = false;
  let check4 = false;
  parties.map((partys) => {
    if (partys.partyName == partyName) {
      check3 = true;
    } //checks wheather party name is already present
    if (partys.partyLeaderCnic == partyLeaderCnic) {
      check4 = true;
    } //checks wheather party leader has already registered a party
  });

  if (check3 == true)
    return res.json({ message: "Party with same name is Already Exists" });

  if (check4 == true)
    return res.json({ message: "Party Leader has already registered a party" });

  const newParty = new Party({
    partyName,
    partySymbol,
    partyImg,
    partyLeaderCnic,
  });

  const elections = await Election.find({}).lean();

  let check8 = false;//current
  let check9 = false;//future
  let check10 = false;//if no upcoming
  //checks for future elections and inserts parties in upcoming elections
    if (elections) {
      elections.map(async (election) => {
        if (
          Number(new Date()) >= Number(election.startTime) &&
          Number(new Date()) <= Number(election.endTime)
        ) {
          check8 = true;
        } //checks for any running elections or a single election

        if (Number(new Date()) < Number(election.startTime)) {
          check9 = true;
          newParty.participate.election.push(election._id);
          newParty.participate.inelection = true;
        } //checks for any elections that are about to start in future
        console.log("new Date",Number(new Date),"end tIME",Number(election.endTime))
       
        if((Number(new Date())<Number(election.endTime))){
          check10 = true;
          election.parties.push(newParty._id);
          //pushes party id into election
      /**     candidates.map((candidate)=>{
            election.candidates.push(candidate.cnic);
          })*/
          await election.save();
          //saving fine, find the right candidates
          //sent list only issue
          console.log(election);
          //if not then return error that there are no upcoming
          //similar to above condition
        }
      
      });

      if (check8 == true) {
        return res
          .status(400)
          .send(
            "you create party when an election is currently running"
          );
      }

      
      if (check10 == false) {
        return res
          .status(400)
          .send(
            "you cannot enter a party when there are no up-coming elections"
          );
      }
    }

  const candidateList = candidate.map((item) => {
     return item;
  }); //returns candidates object 1 by 1

  let check1 = false;
  for (let i = 0; i < candidateList.length; i++) {
    for (let j = 0; j < cnics.length; j++) {
      if (candidateList[i].cnic == cnics[j]) {
        check1 = true;
      }
    }
  } //checks if a candidate already exists in Candidate DB
  //even if one candidate is present, The party is rejected from creation
  if (check1) {
    return res.json({
      message: "Party cannot be registered due to candidate already registered",
    });
  }

  const candidatel = candidate.map(async (item) => {
    const newCandidate = new Candidate({
      cnic: item.cnic,
      name: item.name,
      position: item.position,
      partyId: newParty._id,
      ballotId: item.ballotId,
      candidate,
    });

    newCandidate.ballotId = mongoose.Types.ObjectId(newCandidate.ballotId);
    
    newParty.candidate.push(newCandidate._id); 
    //candidates to the party are added here
    
    await newCandidate.save().catch((err) => {
      return console.log(err);
    });

    const ballot = await Ballot.findOne({ _id: newCandidate.ballotId }).catch(
      (err) => {
        console.log(err);
      }
    );
    ballot.candidate.push(newCandidate._id);//check here
    await ballot.save();
  }); //saving candidates in model and candidates in ballot one by one

 
  await newParty.save().catch((err) => {
    return console.log(err);
  });
  res.status(200).json({ message: "Party has been registered" });
  //check ballot candidate issue 
});

//chain use during candidate registration by party leader
//null is a positive reply,that a person is not a criminal
//true means that he/she is a criminal
router.get("/getcriminal/:_id", async (req, res) => {
  await Criminal.findOne({ _id: _id }).exec((err, doc) => {
    if (!err) {
      res.status(200).json({ message: null });
    } else {
      res.status(400).json({ message: true });
    }
  });
});

//takes _id as input for party and returns party
//and its ref data as well
router.get("/findparty/:_id", async (req, res) => {
  if (!req.params._id) {
    return res.status(400).json({ message: "field is empty" });
  }

  const found = await Party.find({ _id: req.params._id })
    .populate({
      path: "candidate",
      populate: {
        path: "ballotId",
      },
    })
    .exec((err, docs) => {
      if (!err) {
        return res.status(200).json({ message: docs });
      } else {
        return res.status(400).json({ message: err });
      }
    });
});

router.get("/getallpartyname", async (req, res) => {
  await Party.find({})
    .select("partyName")
    .exec((err, docs) => {
      if (!err) {
        res.json(docs);
      } else {
        console.log(err);
      }
    });
});


module.exports = router;
