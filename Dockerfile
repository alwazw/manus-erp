# Dockerfile for ERP System

# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the requirements file first to leverage Docker cache
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY ./src /usr/src/app/src

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Define environment variable (can be overridden by .env)
ENV NAME World

# Run app.py when the container launches
CMD ["python", "src/app.py"]

