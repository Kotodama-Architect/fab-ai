const mongoose = require('mongoose');
const { Schema } = mongoose;

const viewerSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: 'viewer',
      enum: ['viewer'], // Ensures this role is strictly 'viewer'
      immutable: true, // Role cannot be changed after creation
    },
  },
  { timestamps: true },
);

module.exports = viewerSchema; 