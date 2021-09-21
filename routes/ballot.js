const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const axios = require("axios");
const requireLogin = require("../middleware/requirelogin");

//Register Models
require("../Models/ballot");

//Models
const Ballot = mongoose.model("Ballot");

router.post("/createballot", async (req, res) => {
  const { ballotid, ballotname, areaId } = req.body; //send objectId of AreaId

  if (!ballotid || !ballotname || !areaId) {
    return res.status(400).json({ message: "one or more fields are empty" });
  }

  const found = await Ballot.findOne({ ballotid }).then((resp) => {
    if (resp) {
      return res.json({ message: "ballot already present with this id" });
    }
  });

  if (found) {
    return res.json({ message: "ballot already present with this id" });
  }

  const newBallot = new Ballot({
    ballotid,
    ballotname,
    areaId,
  });

  newBallot
    .save()
    .then((resp) => {
      return res.status(200).json({ message: "ballot successfully saved" });
    })
    .catch((err) => {
      return res.status(400).json({ message: err });
    });
});

router.get("/findballot", async (req, res) => {
  const { ballotid } = req.body;

  if (!ballotid) {
    return res.status(400).json({ message: "one or mor fields are empty" });
  }

  Ballot.findOne({ ballotid })
    .populate("areaId")
    .exec((err, docs) => {
      if (err) {
        return res.json({ message: err });
      } else {
        return res.json({ message: docs });
      }
    });
});

router.put("/updateballot", async (req, res) => {
  const { ballotid, ballotname, areaId } = req.body;

  const found = await axios({
    method: "get",
    url: "http://localhost:1970/findballot",
    data: {
      ballotid: ballotid,
    },
  })
    .then((resp) => {
      if (resp.data["message"] == null) {
        return res
          .status(403)
          .json({ message: "ballot not present with this id" });
      }
    })
    .catch((err) => console.log(err));

  try {
    if (!ballotid) {
      return res.status(400).json({ message: "field is empty" });
    }

    if (!areaId && !ballotname) {
      return res
        .status(400)
        .json({ message: "no updation fields are entered" });
    }
  } catch {
    /*empty*/
  }

  if (ballotname) {
    Ballot.findOneAndUpdate({ ballotid }, { ballotname }).catch((err) => {
      return res.status(403).json({ message: err });
    });
  }

  if (areaId) {
    Ballot.findOneAndUpdate({ ballotid }, { areaId }).catch((err) => {
      return res.status(403).json({ message: err });
    });
  }

  return res.status(200).json({ message: "ballot successfully updated" });
});

router.delete("/deleteballot", async (req, res) => {
  const { ballotid } = req.body;

  if (!ballotid) {
    return res.status(400).json({ message: "field is empty" });
  }

  const found = await axios({
    method: "get",
    url: "http://localhost:1970/findballot",
    data: {
      ballotid: ballotid,
    },
  })
    .then((resp) => {
      console.log(resp.data);
      if (resp.data["message"] == null) {
        return res
          .status(403)
          .json({ message: "ballot not present with this id" });
      }
    })
    .catch((err) => console.log(err));

  Ballot.findOneAndDelete({ ballotid })
    .then(() => {
      res.status(200).json({ message: "ballot successfully deleted" });
    })
    .catch((err) => {
      res.status(400).json({ message: err });
    });
});

router.get("/findallballot", async (req, res) => {
  Ballot.find({})
    .populate("areaId")
    .exec((err, docs) => {
      if (err) {
        return res.json({ message: err });
      } else {
        console.log(docs);
        return res.json({ message: docs });
      }
    });
});

module.exports = router;
