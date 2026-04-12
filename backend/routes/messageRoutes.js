const express = require("express");
const router  = express.Router();

const { getMessages, createMessage, getConversations } = require("../controllers/messageController");

router.get("/conversations", getConversations);
router.get("/:claim_id", getMessages);
router.post("/",         createMessage);

module.exports = router;
