#!/bin/bash
# local-setup.sh
# This script automates the local setup process for the Node.js Hello World application
# It installs dependencies and starts the server
# Version: 1.0.0

# Exit immediately if a command exits with a non-zero status
set -e

# Function to display colored output for better readability
print_message() {
  local color_green="\033[0;32m"
  local color_reset="\033[0m"
  echo -e "${color_green}$1${color_reset}"
}

# Function to display error messages
print_error() {
  local color_red="\033[0;31m"
  local color_reset="\033[0m"
  echo -e "${color_red}ERROR: $1${color_reset}" >&2
}

# Main setup function
setup_environment() {
  print_message "Starting local setup process..."
  
  # Check if Node.js is installed
  if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js v18.x LTS or higher."
    exit 1
  fi
  
  # Check node version
  node_version=$(node -v | cut -d 'v' -f 2)
  print_message "Detected Node.js version: v${node_version}"
  
  # Navigate to project root
  print_message "Navigating to project directory..."
  
  # Find the root directory (adjust as needed based on where this script is located)
  if [[ -d "../../" ]]; then
    cd ../../
  fi
  
  # Install dependencies
  print_message "Installing Node.js dependencies..."
  npm install
  
  if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies"
    exit 1
  fi
  
  # Start the server
  print_message "Starting the Node.js HTTP server..."
  print_message "The server will be available at http://localhost:3000/hello"
  print_message "Press Ctrl+C to stop the server"
  
  # Start the server using npm script
  npm start
}

# Execute the setup function
setup_environment