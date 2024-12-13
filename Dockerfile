#set the official node.js image
FROM node:20.13.1


# set the working directory in the container
WORKDIR /usr/src/app


# Install dependencies
COPY package.json ./
RUN npm install 


# COCOLOCO-ECOMMERCE => WORKDIR  (Copy the rest of the application code)
COPY . .


#Expose the port : 3000
EXPOSE 3000



CMD [ "npm","start" ]