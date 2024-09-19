import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Food Wheel - Pick a Random Food Choice";
let descriptionStr =
  "Explore Food wheel and spin to pick a random food item out of multiple choices.";

let segmentsData = [
  "Tacos (Mexico): Corn tortillas filled with meat, vegetables, and salsa.",
  "Shawarma (Middle East): Marinated meat cooked on a vertical rotisserie and served in a pita bread.",
  "Sauerbraten (Germany): A marinated and braised beef roast.",
  "Sashimi (Japan): Raw fish sliced into thin pieces.",
  "Samosas (India): Deep-fried pastries filled with spiced potatoes and peas.",
  "Ramen (Japan): A noodle soup with broth, noodles, and toppings.",
  "Poutine (Canada): French fries topped with cheese curds and gravy.",
  "Pizza (Italy): A flatbread with tomato sauce, cheese, and toppings.",
  "Picanha: A Brazilian cut of beef, grilled or roasted and served with chimichurri sauce.",
  "Peking Duck (China): Roasted duck served with pancakes, hoisin sauce, and scallions.",
  "Paneer Tikka (India): Marinated paneer cheese cooked in a tandoor oven.",
  "Palak Paneer (India): A spinach and paneer cheese dish.",
  "Paella (Spain): A rice dish with seafood, chicken, or vegetables.",
  "Pad Thai (Thailand): A stir-fried noodle dish with shrimp, tofu, or chicken.",
  "Mole Poblano: A rich and complex Mexican sauce made with chocolate, chili peppers, and other spices.",
  "Masala Dosa (India): A crispy crepe filled with a spiced potato mixture.",
  "Kebabs (Middle East): Grilled skewers of meat or vegetables.",
  "Idli Sambar (India): Steamed rice cakes served with a lentil soup.",
  "Grilled Cheese Sandwich (USA): A sandwich with cheese and bread grilled in butter.",
  "Fish and Chips (United Kingdom): Deep-fried fish served with French fries.",
  "Falafel (Middle East): Deep-fried balls of ground chickpeas or fava beans.",
  "Empanadas: Pastries filled with meat, cheese, or vegetables, popular throughout South America.",
  "Empanadas (Latin America): Pastries filled with meat, cheese, or vegetables.",
  "Dosas (India): Thin, crispy crepes made from fermented rice and lentils.",
  "Croissants (France): Flaky pastries made with butter and puff pastry.",
  "Cornbread: A sweet or savory bread made with cornmeal.",
  "Chole Bhature: A dish of chickpeas and fried bread.",
  "Chili: A hearty stew made with meat, beans, tomatoes, and spices.",
  "Cheeseburger: A classic American dish consisting of a hamburger patty, cheese, lettuce, tomato, onion, pickles, and mayonnaise on a bun.",
  "Ceviche: A seafood dish made with raw fish marinated in citrus juice and spices.",
  "Butter Chicken (India): Chicken cooked in a creamy tomato-based sauce.",
  "Biryani (India): A rice dish with meat, vegetables, and spices.",
  "BBQ Ribs: Pork or beef ribs cooked slowly over a wood fire and slathered in barbecue sauce.",
  "Arepas: Cornmeal cakes that can be filled with various ingredients.",
  "Apple Pie: A sweet dessert made with apples, pastry crust, and often topped with vanilla ice cream.",
];

export const metadata = {
  title: titleStr,
  description: descriptionStr,
};

export default async function Page({ params }) {
  return (
    <>
      <WheelWithInput newSegments={segmentsData} />
      <div className="p-3">
        <h1 className="text-4xl mb-2">{titleStr}</h1>
        <div className="text-lg">
          <p className="mb-3">
            A food spin wheel is a tool to help you randomly select a food item.
            It is often used as a fun and interactive way to encourage
            individuals to try new recipe or to make meal planning more
            exciting.
          </p>
          <p className="mb-3">
            It can be customized to include various food categories such as
            fruits, vegetables, proteins, grains, and dairy products, among
            others. The user can add their own items and spin the wheel and
            whatever food item the wheel lands on is what they must eat or
            incorporate into their meal plan for the day.
          </p>
          <p>
            These wheels can also be used in educational settings to teach
            children about different food groups and encourage healthy eating
            habits. They can be designed to include fun graphics or
            illustrations of different foods, making it an engaging and
            interactive tool for learning.
          </p>
        </div>
      </div>
    </>
  );
}
