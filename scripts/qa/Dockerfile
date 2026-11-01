FROM mcr.microsoft.com/playwright:v1.64.1-noble
USER root
# A private null sink lets Firefox's real AudioContext clock advance without hardware.
RUN apt-get update && apt-get install -y --no-install-recommends pulseaudio && rm -rf /var/lib/apt/lists/*
